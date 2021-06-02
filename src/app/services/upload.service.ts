import { Injectable } from "@angular/core";
import { FileTransfer, FileTransferObject, FileUploadOptions } from '@ionic-native/file-transfer';
import { File } from '@ionic-native/file';
import { Storage } from '@ionic/storage';
import { USER_DATA_KEY, UPLOAD_DETAILS, USER_DATA_AUTH_KEY } from "../app.constants";
import { Subject } from "rxjs/Subject";
import { HTTP } from "@ionic-native/http";
import { Console } from "@angular/core/src/console";

export type VideoUploadDetails = {
    source: string,
    title: string,
    description: string,
    tags: string,
    category: string,
    level: string,
    targetMarketLoc: string,
    allowComment: string,
    allowSharing: string,
    privacy: string,
    filename?: string
};
//TODO: If Possible , upload video and video details change to use new api
@Injectable()
export class UploadService {
    public static readonly NOT_UPLOADING = 0;
    public static readonly PREPARING_VIDEO_UPLOAD = 1;
    public static readonly SAVING_VIDEO_DETAILS = 2;
    public static readonly SENDING_VIDEO_DETAILS = 3;
    public static readonly STARTING_VIDEO_UPLOAD = 4;
    public static readonly VIDEO_UPLOADING = 5;
    public static readonly FINISHED_VIDEO_UPLOAD = 6;

    public static readonly ERROR_UPLOAD_CANCELLED = -1;
    public static readonly ERROR_DURING_DETAILS_SAVE = -2;
    public static readonly ERROR_DURING_UPLOAD = -3;
    public static readonly ERROR_DURING_DETAILS_SEND = -4;

    private uploadStatus = UploadService.NOT_UPLOADING;
    private currentUploadObservable: Subject<number>;
    private currentUploadStatusObservable: Subject<number>;
    private fileTransferObject: FileTransferObject;
    private API_URL = 'https://api.the-v.net/';

    constructor(
        private file: File,
        private storage: Storage,
        private http: HTTP,
        private fileTransfer: FileTransfer
    ) {
        this.currentUploadStatusObservable = new Subject<number>();

        // make sure the service's internal status variable is also updated
        this.currentUploadStatusObservable.subscribe(status => {
            this.uploadStatus = status;
        });
        console.log(this.currentUploadStatusObservable);
    }

    getCurrentUploadStatus() {
        return this.uploadStatus;
    }

    isAnUploadInProgress() {
        return this.currentUploadStatusObservable != null
            && this.currentUploadObservable != null
            && this.uploadStatus > 0;
    }

    getCurrentUploadStatusObservable() {
        return this.currentUploadStatusObservable;
    }

    getInProgressUploadObservable() {
        console.log(this.currentUploadObservable);
        return this.currentUploadObservable;
    }

    uploadVideo(details: VideoUploadDetails) {
        this.currentUploadStatusObservable.next(UploadService.PREPARING_VIDEO_UPLOAD);

        let lastIndexOfSlash = details.source.lastIndexOf('/');
        let fileName = details.source.substring(lastIndexOfSlash + 1);
        let guid = Math.round(new Date().getTime() + (Math.random() * 100));

       // this.currentUploadStatusObservable.next(UploadService.SAVING_VIDEO_DETAILS);

        
        // return this.saveVideoDetailsToStorage(details).then(_ => {
        //     this.currentUploadStatusObservable.next(UploadService.VIDEO_UPLOADING);
        //    //return this.sendVideoDetailsToServer(details, guid);
        //     return this.sendVideoToServer(`${guid}`, details);
        return this.sendVideoToServer(`${guid}`, details).then(observable => {
            //this.currentUploadStatusObservable.next(UploadService.VIDEO_UPLOADING);
            return observable;
        });
    }

    cancelUpload() {
        if (this.fileTransferObject) {
            this.fileTransferObject.abort();
        }
    }

    private sendVideoToServer(guid: string, details: VideoUploadDetails) : Promise<Subject<number>> {

        //let uri = encodeURI('https://api.the-v.net/Vtube.aspx');
        if (this.isAnUploadInProgress()) {
            return Promise.reject(new Error('upload_in_progress'));
        }

        this.storage.get(USER_DATA_AUTH_KEY).then((auth) => {
            let uri = this.API_URL + `Video/upload/${auth.aud}`;
            let vidSrc = details.source;
            let lastIndexOfSlash = vidSrc.lastIndexOf('/');
            let fileName = vidSrc.substring(lastIndexOfSlash + 1);
            let fileContainingDirectory = vidSrc.substring(0, lastIndexOfSlash);

            return this.file.resolveDirectoryUrl(fileContainingDirectory).then(vid => {
                console.log("1", vid);
                return this.file.getFile(vid, fileName, {});
            }).then(file => {
                console.log("2",file);
                return new Promise<string>((resolve, reject) => {
                    // it becomes null when platform is ios
                    file.file(
                        file => resolve(file.type == null ? 'video/quicktime' : file.type),
                        err => resolve('video/*'));
                });
            }).then(mimetype => {
                console.log("3", mimetype);
                    let options : FileUploadOptions = {
                        fileKey: 'files',
                        fileName: fileName,
                        mimeType: mimetype,
                        headers:{
                            Authorization: `${auth.token_type} ${auth.access_token}`
                        },
                        params: {
                            type: 'video',
                        },
                    }

                    this.currentUploadObservable = new Subject<number>();
                    let observable = this.currentUploadObservable;

                    let errorOccured = (error) => {
                        observable.error(error);
                        this.currentUploadObservable = null;
                    };
                    this.currentUploadStatusObservable.next(UploadService.STARTING_VIDEO_UPLOAD);
                    this.currentUploadStatusObservable.next(UploadService.VIDEO_UPLOADING);
                    this.fileTransferObject = this.fileTransfer.create();
                    this.fileTransferObject.onProgress(e => { 
                        let progress = (e.lengthComputable) ? Math.floor(e.loaded / e.total * 100) : -1;
                        observable.next(progress);
                        console.log("Uploaded " + e.loaded.toString() + " of " + e.total.toString());
                    });
                    return this.fileTransferObject.upload(vidSrc, uri, options).then(r => {
                        observable.complete();
                        this.currentUploadObservable = null;
                        
                        //send details to server
                        console.log(r.response);
                        console.log(r.responseCode);
                        let res = JSON.parse(r.response);
                        return this.sendVideoDetailsToServer(details, guid, res.filename);
                    }, error => {
                        // TODO: handle cancelled video upload
                        console.error("ERROR UPLOADING: ", error);
                        this.currentUploadStatusObservable.next(UploadService.ERROR_DURING_UPLOAD);
                        errorOccured(error);
                        return observable;
                    }).catch(error => {
                        console.error("ERROR UPLOADING: ", error);
                        this.currentUploadStatusObservable.next(UploadService.ERROR_DURING_UPLOAD);
                        errorOccured(error);
                        return observable;
                    });
                   
            })
            .catch(e=>{
                console.log(e);
            });
        }) 
        .catch(e=>{
            console.log(e);
        });
    }

    private getVideoDetailsFromStorage() {
        return this.storage.get(UPLOAD_DETAILS).then(details => <VideoUploadDetails>details);
    }

    private saveVideoDetailsToStorage(details: VideoUploadDetails) {
        return this.storage.set(UPLOAD_DETAILS, details).then(_ => details);
    }

    private sendVideoDetailsToServer(details: VideoUploadDetails, guid, filename) {
        console.log(filename);
        // if (this.isAnUploadInProgress()) {
        //     return Promise.reject(new Error('upload_in_progress'));
        // }
        this.currentUploadStatusObservable.next(UploadService.SENDING_VIDEO_DETAILS);
        return this.storage.get(USER_DATA_AUTH_KEY).then(auth => {
            let body = {
                "name": details.title,
                "description": details.description,
                "tags": details.tags,
                "categories": details.category,
                "levelid": details.level,
                "market_location": details.targetMarketLoc.toString(),
                "is_comments_allowed": details.allowComment,
                "is_share_allowed": details.allowSharing,
                "access_type": details.privacy,
                "filename": filename,
                "createdby": auth.aud,
                "isapproved":"false",
                "allow_ads": "false",
                "userid": auth.aud,
                "runningnum": guid
            };
            // let body = {
            //    ' 'action': 'DDrupal_Video_Create',
            // 'name': details.title,
            // 'desc': details.description,
            // 'tags': details.tags,
            // 'category': details.category,
            // 'level': details.level,
            // 'targetMarketLocations': details.targetMarketLoc.toString(),
            // 'comment': details.allowComment,
            // 'share': details.allowSharing,
            // 'publish': details.privacy,
            // 'filename': guid.toString(),
            // 'userid': auth.aud'
            // };
            

            this.currentUploadObservable = new Subject<number>();
            let observable = this.currentUploadObservable;

            let errorOccured = (error) => {
                console.log(error);
                observable.error(error);
                this.currentUploadObservable = null;
                this.currentUploadStatusObservable.next(UploadService.ERROR_DURING_DETAILS_SEND);
            };

            // let header = {
            //     'Content-Type': 'application/json',
            //     'Authorization': `${auth.token_type} ${auth.access_token}`
            // };
            
            console.log(body);
            //console.log(header);
            this.http.post(this.API_URL+`Video/detail/${auth.aud}`, body, {'Content-Type':'application/json',  Authorization: `${auth.token_type} ${auth.access_token}` }).then(r => {
                console.log(r);
                //let response = JSON.parse(r.data);
                //console.log(response);
                if (r.data != "") {
                    let pk = r.data.split('"').join('');
                    console.log(pk);
                    return this.http.get(this.API_URL+`site/check?id=${pk}`,{},{});
                }
                else {
                    // this.currentUploadStatusObservable.next(UploadService.STARTING_VIDEO_UPLOAD);
                    // this.currentUploadStatusObservable.next(UploadService.VIDEO_UPLOADING);
                    //return this.sendVideoToServer(guid, details.source);
                    this.currentUploadObservable = null;
                    this.currentUploadStatusObservable.next(UploadService.ERROR_DURING_DETAILS_SEND);
                    observable.complete();
                }
            },
            error=>{
                console.log(error);
                observable.complete();
                this.currentUploadObservable = null;
                this.currentUploadStatusObservable.next(UploadService.ERROR_DURING_DETAILS_SEND);
            })
            .then(id=>{
                    console.log(id);
                    this.currentUploadStatusObservable.next(UploadService.FINISHED_VIDEO_UPLOAD);
                    observable.complete();
            },
            error=>{
                console.log(error);
                // this.currentUploadObservable = null;
                //     this.currentUploadStatusObservable.next(UploadService.ERROR_DURING_DETAILS_SEND);
                //     observable.complete();
                this.currentUploadStatusObservable.next(UploadService.FINISHED_VIDEO_UPLOAD);
                observable.complete();
            }).catch(error => {
                errorOccured(error);
            });
            return observable;
        });
    }
}