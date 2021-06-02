import { Injectable } from "@angular/core";
import { Observable } from "rxjs/Observable";
import { Subscriber } from "rxjs/Subscriber";
import { SQLite, SQLiteObject } from '@ionic-native/sqlite';
import { openSqliteDb } from "../app.utils";
import { DownloadEntry } from "../models/download.models";
import { File } from '@ionic-native/file';
import { FileTransfer } from "@ionic-native/file-transfer";
import { Platform, AlertController } from "ionic-angular";
import { AndroidPermissions } from '@ionic-native/android-permissions';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/operator/share';
import 'rxjs/add/operator/map';
import { GoogleAnalyticsService } from "./analytics.service";
import { HTTP } from '@ionic-native/http';

type BcidAndResult = {
    bcid: string,
    isSuccessful: boolean
}

@Injectable()
export class DownloadService {
    private rootPath: string;
    private rootDirectory: string;
    private readonly folderPath: string = 'videos';
    private readonly thumbsFolderPath: string = 'videos/thumbs';

    private inProgressDownloads: {
        [bcid: string]: {
            observable?: Observable<number>,
            isGoingToShowAlert?: boolean,
            hasShownAlert?: boolean,
            hasShownError?: boolean
        }
    } = {};

    constructor(
        private androidPermissions: AndroidPermissions,
        private alertController: AlertController,
        private fileTransfer: FileTransfer,
        private platform: Platform,
        private sqlite: SQLite,
        private file: File,
        private http: HTTP,
        private gaSvc: GoogleAnalyticsService
    ) { }

    updatePaths() {
        if (this.platform.is('ios')) {
            this.rootDirectory = this.file.documentsDirectory;
        } else if (this.platform.is('android')) {
            this.rootDirectory = this.file.externalDataDirectory;
        } else {
            throw new Error('Platform not supported.');
        }
        this.rootPath = `${this.rootDirectory}${this.folderPath}`;
    }

    getInProgressDownloads(bcid: string): Observable<number> {
        if (this.inProgressDownloads[bcid])
            return this.inProgressDownloads[bcid].observable;
        else
            return null;
    }

    getAllInProgressDownloads() {
        return this.inProgressDownloads;
    }

    getPathOfVideo(id: string) {
        this.updatePaths();
        return `${this.rootPath}/${id}.mp4`;
    }

    getPathOfImageForVideo(id: string) {
        this.updatePaths();
        return `${this.rootPath}/thumbs/${id}.jpeg`;
    }

    getDownloadedVideosOf(userId: string) {
        this.updatePaths();

        return this.preparePlaylistTable().then(db => {
            return db.executeSql('SELECT * FROM downloads WHERE memid = ?', [userId])
        }).then(a => {
            return new Promise<DownloadEntry[]>((resolve, reject) => {
                try {
                    let downloadEntries: DownloadEntry[] = []
                    for (let i = 0; i < a.rows.length; i++) {
                        let rawDownloadEntry = a.rows.item(i);

                        let downloadEntry: DownloadEntry = {
                            id: rawDownloadEntry.id,
                            bcid: rawDownloadEntry.bcid,
                            memid: rawDownloadEntry.memid,
                            dl_date: new Date(rawDownloadEntry.dl_date),
                            title: rawDownloadEntry.title,
                            channelName: rawDownloadEntry.channelName,
                            time: rawDownloadEntry.time,
                            imageUrl: this.getPathOfImageForVideo(rawDownloadEntry.bcid)
                        }
                        downloadEntries.push(downloadEntry);
                    }
                    resolve(downloadEntries)
                } catch (e) {
                    reject(e)
                }
            })
        })
    }

    isVideoDownloaded(userId: string, bcid: string) {
        this.updatePaths();

        return this.preparePlaylistTable().then(db => {
            return db.executeSql('SELECT * FROM downloads WHERE memid = ? and bcid = ?', [userId, bcid])
        }).then(a => {
            if (a.rows.length > 1)
                throw new Error('multiple_entries');
            return a.rows.length === 1;
        }).then(isInManifest => {
            return this.file.checkFile(this.rootDirectory, `${this.folderPath}/${bcid}.mp4`).then(isPresent => {
                return isInManifest && isPresent && this.getInProgressDownloads(bcid) === null;
            }).catch(e => {
                return false;
            });
        });
    }

    markShowDownloadFinishAlertFor(id: string) {
        let ipd = this.inProgressDownloads[id];
        if (ipd && !ipd.isGoingToShowAlert) {
            ipd.isGoingToShowAlert = true;
        }
    }

    checkIfVideoDownloadable(bcid:string){
        let url = `https://cums.the-v.net/vid.aspx?id=${bcid}&check=1`;
        return this.http.get(url, {},{})
        .then(r=>{
            if(r.data == "NONE" || r.data == "" || r.data.indexOf("https://") < 0|| r.data.indexOf("http://") < 0)
                return false;
            else 
                return true;
        })
    }

    addVideoFor(userId: string, email: string, bcid: string, title: string, channelName: string, time: string, imageUrl: string) {
        this.updatePaths();

        return new Promise<Observable<number>>((resolve, reject) => {
            // check if the video has lready been downloaded and is stated in the manifest (local db)
            this.isVideoDownloaded(userId, bcid).then(isDownloaded => {
                if (isDownloaded)
                    throw new Error('already_downloaded');
                else{ //get src from api
                    let url = `https://cums.the-v.net/vid.aspx?id=${bcid}&irid=${email}`;
                    return this.http.get(url, {},{}).then(response => response.data);
                }
                    //return this.preparePlaylistTable();
            }).then(finalUrl => {
                // save entry to local database
                console.log(finalUrl);
                if (finalUrl == "NONE"){
                    throw new Error("video_not_downloadable");
                }
                else{
                    return this.preparePlaylistTable().then(db=>{
                        return db.executeSql('INSERT INTO downloads(bcid, memid, dl_date, title, channelName, time) VALUES(?, ?, ?, ?, ?, ?)', [
                            bcid, userId, new Date().toLocaleDateString(), title, channelName, time
                        ]).then(a=>{
                            if (a.rowsAffected === 1) {
                                // get the download url of the video
                                //let url = `https://cums.the-v.net/vid.aspx?id=${bcid}&irid=${email}`;
                                return finalUrl;
                            } else {
                                throw new Error('not_successfully_inserted');
                            }
                        })
                    })
                }
                
            }).then(finalUrl => {
                console.log(finalUrl);
                // check if the android device has storage permissions
                if (this.platform.is('android')) {
                    return Promise.all([
                        this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.WRITE_EXTERNAL_STORAGE),
                        this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.READ_EXTERNAL_STORAGE)
                    ]).then(e => {
                        if (e.map(r => r.hasPermission).every(hp => hp === true)) {
                            return finalUrl;
                        } else {
                            return this.androidPermissions.requestPermissions([
                                this.androidPermissions.PERMISSION.WRITE_EXTERNAL_STORAGE,
                                this.androidPermissions.PERMISSION.READ_EXTERNAL_STORAGE
                            ]).then(e => {
                                if (e.hasPermission)
                                    return finalUrl;
                                else
                                    throw new Error('permission_not_granted');
                            });
                        }
                    });
                } else {
                    return finalUrl;
                }
            }).then(finalUrl => {
                console.log(finalUrl);
                // TODO: save video and thumb to a directory with a name of `userid`
                // check if video has already been downloaded
                return this.file.checkFile(this.rootDirectory, `${this.folderPath}/${bcid}.mp4`)
                .then(isPresent => {
                    console.log(isPresent);
                    if (isPresent) // remove file if it has already been downloaded
                        return this.file.removeFile(`${this.rootDirectory}`, `${this.folderPath}/${bcid}.mp4`).then(r => finalUrl);
                    else
                        return finalUrl;
                }).catch(err => {
                    console.log(err);
                    return Promise.all([
                        this.file.createDir(this.rootDirectory, this.folderPath, true),
                        this.file.createDir(this.rootDirectory, this.thumbsFolderPath, true),
                    ]).then(_ => finalUrl).catch(_ => {
                        throw new Error('directory_creation');
                    });
                });
            }).then(finalUrl => {
                // download video's thumbnail
                let path = `${this.rootDirectory}/${this.thumbsFolderPath}/${bcid}.jpeg`;
                let fileTransferObject = this.fileTransfer.create();
                return fileTransferObject.download(imageUrl, path, true).then(entry => {
                    return finalUrl;
                });
            }).then(finalUrl => {
                // start download of the video and return an observable so 
                // the download progress can be observed
                console.log(finalUrl);
                if (finalUrl === null || finalUrl === '') {
                    throw new Error('url_not_available');
                } else {
                    let obs = new Observable((observer: Subscriber<number>) => {
                        let path = `${this.rootPath}/${bcid}.mp4`;
                        let fileTransferObject = this.fileTransfer.create();
                        fileTransferObject.onProgress(e => {
                            let progress = (e.lengthComputable) ? Math.floor(e.loaded / e.total * 100) : -1;
                            observer.next(progress);
                        });
                        fileTransferObject.download(finalUrl, path, true).then(entry => {
                            console.log(entry);
                            observer.complete();
                            this.gaSvc.gaEventTracker('Video','Download','Downloaded a video');
                        }).catch(e => {
                            observer.error(e);
                        });
                        return () => {
                            if (this.inProgressDownloads[bcid])
                                this.inProgressDownloads[bcid].observable = null;
                        }
                    }).share();

                    if (!this.inProgressDownloads[bcid])
                        this.inProgressDownloads[bcid] = {
                            isGoingToShowAlert: false,
                            hasShownAlert: false,
                            hasShownError: false
                        };
                    this.inProgressDownloads[bcid].observable = obs;

                    resolve(obs);
                }
            }).catch(e => {
                console.log(e);
                reject(e);
            })
        })
    }

    removeVideoFor(userId: string, bcid: string) {
        this.updatePaths();

        return this.preparePlaylistTable().then(db => {
            return db.executeSql('DELETE FROM downloads WHERE memid = ? and bcid = ?', [userId, bcid])
        }).then(a => {
            if (a.rowsAffected === 1)
                return true;
            else if (a.rowsAffected === 0)
                return false;
            else
                throw new Error('Multiple values were deleted!');
        }).then(isManifestUpdated => {
            return this.deleteVideoAndThumbnailFor(userId, bcid);
        }).then(result => {
            return result.every(r => r.success);
        })
    }

    removeAllVideosFor(userId: string) {
        return this.getDownloadedVideosOf(userId).then(downloadEntries => {
            // get all entries for the specified user
            let playlistBcids = downloadEntries.map(d => d.bcid);

            // delete all the downloaded videos of the users 
            return this.performCleanup(playlistBcids);
        }).then(bcids => {
            // delete all the entries of the deleted videos
            return this.preparePlaylistTable().then(db => {
                let bcidStr = bcids.join(',');
                return db.executeSql('DELETE FROM downloads WHERE bcid IN (?)', [bcidStr]);
            });
        }).then(a => {
            // retrieve all the entries of the downloaded videos again
            return this.getDownloadedVideosOf(userId);
        }).then(downloadEntries => {
            // perform checking again to make sure if there are still entries for the user
            let bcidsOfVideos = downloadEntries.map(d => d.bcid);
            return new Promise<boolean>((resolve, reject) => {
                resolve(bcidsOfVideos.length === 0);
            });
        });
    }

    removeAllExpiredVideosFor(userId: string) {
        return this.getDownloadedVideosOf(userId).then(downloadEntries => {
            // filter videos which are past the expiration data
            let bcidsOfExpiredVideos = downloadEntries.filter(d => {
                let sevenDaysFromDlDate = new Date(d.dl_date);
                sevenDaysFromDlDate.setDate(sevenDaysFromDlDate.getDate() + 7);
                return sevenDaysFromDlDate.getTime() <= Date.now();
            }).map(d => d.bcid);

            // delete all the videos in list from storage
            return this.performCleanup(bcidsOfExpiredVideos);
        }).then(bcids => {
            // delete all entries of the videos which are successfully deleted from the storage
            return this.preparePlaylistTable().then(db => {
                let bcidStr = bcids.join(',');
                return db.executeSql('DELETE FROM downloads WHERE bcid IN (?)', [bcidStr]);
            });
        }).then(_ => {
            // retrieve all the entries of the downloaded videos again
            return this.getDownloadedVideosOf(userId);
        }).then(downloadEntries => {
            // perform checking again to make sure if there are still expired entries
            let thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            let bcidsOfExpiredVideos = downloadEntries.filter(d => {
                return d.dl_date.getDate() <= Date.now();
            }).map(d => d.bcid);

            return new Promise<boolean>((resolve, reject) => {
                resolve(bcidsOfExpiredVideos.length === 0);
            });
        });
    }

    showDownloadFinishAlertFor(id: string) {
        let ipd = this.inProgressDownloads[id];
        if (ipd && !ipd.hasShownAlert) {
            this.inProgressDownloads[id] = null;
            let alert = this.alertController.create({
                title: 'Download Video',
                message: 'The video has been successfully downloaded!',
                buttons: [{
                    text: 'OK', handler: () => {
                        alert.dismiss();
                        return true;
                    }
                }]
            });
            alert.present();
        }
    }

    showDownloadErrorFinishAlertFor(id: string) {
        let ipd = this.inProgressDownloads[id];
        if (ipd && !ipd.hasShownError) {
            this.inProgressDownloads[id] = null;
            let alert = this.alertController.create({
                title: 'Oh no!',
                message: 'An error occurred while trying to download the video. Please try again.',
                buttons: [{
                    text: 'OK', handler: () => {
                        alert.dismiss();
                        return true;
                    }
                }]
            });
            alert.present();
        }
    }

    private performCleanup(bcids: string[]) {
        this.updatePaths();

        return new Promise<string[]>((resolve, reject) => {
            try {
                let promises: Promise<BcidAndResult>[] = [];
                bcids.forEach(bcid => {
                    promises.push(this.deleteVideoAndThumbnailFor('<userid>', bcid).then(results => {
                        return { bcid: bcid, isSuccessful: results.every(r => r.success) };
                    }));
                });
                Promise.all(promises).then(p => {
                    if (p.every(r => r.isSuccessful)) {
                        resolve(p.map(r => r.bcid));
                    } else {
                        let successfulDeletions = p.filter(r => r.isSuccessful);
                        resolve(successfulDeletions.map(r => r.bcid));
                    }
                });
            } catch (e) {
                reject(e);
            }
        })
    }

    private deleteVideoAndThumbnailFor(userId: string, bcid: string) {
        return Promise.all([
            this.file.checkFile(this.rootDirectory, `${this.folderPath}/${bcid}.mp4`).then(isPresent => {
                if (isPresent)
                    return this.file.removeFile(`${this.rootDirectory}`, `${this.folderPath}/${bcid}.mp4`);
                else
                    throw new Error('not_found_video:' + bcid);
            }),
            this.file.checkFile(this.rootDirectory, `${this.thumbsFolderPath}/${bcid}.jpeg`).then(isPresent => {
                if (isPresent)
                    return this.file.removeFile(`${this.rootDirectory}`, `${this.thumbsFolderPath}/${bcid}.jpeg`);
                else
                    throw new Error('not_found_thumb:' + bcid);
            })
        ]);
    }

    private preparePlaylistTable() {
        return openSqliteDb(this.sqlite).then(db => {
            return this.createDownloadsTable(db);
        })
    }

    private createDownloadsTable(db: SQLiteObject) {
        return new Promise<SQLiteObject>((resolve, reject) => {
            try {
                db.executeSql(`CREATE TABLE IF NOT EXISTS downloads(
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        bcid CHAR(13) NOT NULL,
                        memid CHAR(36) NOT NULL,
                        title TEXT NOT NULL,
                        channelName TEXT NOT NULL,
                        time TEXT NOT NULL,
                        dl_date TEXT NOT NULL)`,[])
                    .then(() => { resolve(db); })
                    .catch(e => { reject(e); })
            } catch (e) {
                reject(e);
            }
        });
    }
}