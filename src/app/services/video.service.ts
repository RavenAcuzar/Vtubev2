import { Injectable } from '@angular/core';
import { openSqliteDb } from '../app.utils';
import { DownloadService } from './download.service';
import { UserService } from './user.service';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';
import { SQLiteObject, SQLite } from '@ionic-native/sqlite';
import { GoogleAnalyticsService } from './analytics.service';
//import { PushNotificationService } from './pushnotif.service';
import { Storage } from '@ionic/storage';
import { APP_LANG, USER_DATA_AUTH_KEY } from '../app.constants';
import { HTTP } from '@ionic-native/http';

@Injectable()
export class VideoService {
	//private static API_URL = 'https://cums.the-v.net/site.aspx'
	private API_URL = 'https://api.the-v.net';
	constructor(
		private http:HTTP,
		private sqlite: SQLite,
		private downloadService: DownloadService,
		private userService: UserService,
		private gaSvc: GoogleAnalyticsService,
		//private pushNotif: PushNotificationService,
		private storage: Storage
	) {}

	getDetails(id: string): Promise<any>{
		return this.storage.get(APP_LANG).then((lang) => {
			return this.storage.get(USER_DATA_AUTH_KEY).then((auth) => {
				// let headers = '';
				 let uid = '';
				 let autho = ' ';
				if (auth) {

				autho = `${auth.token_type} ${auth.access_token}`;
				uid = auth.aud;
				}

				return this.http
					.get(this.API_URL + `/Video/translate/${lang}/${id}/${uid}`, {},{ Authorization: autho })
					//.toPromise()
					.then(
						(res) => {
							let r = JSON.parse(res.data);
							r.map((e) => {
								e.channelImage = 'https://api.the-v.net/site/v2.0/channel?id=' + e.channelId;
								if (lang != 'en') {
									if (e.t_title && e.t_title != '') e.title = e.t_title;
									if (e.t_desc && e.t_desc != '') e.description = e.t_desc;
								}
								return e;
							});
							return r[0];
						},
						(err: Response) => {
							if (err.statusText == 'Unauthorized' || err.status == 401) {
								this.userService.refreshAuth().then((r) => {
									if (r) {
										this.getDetails(id);
									} else {
										throw new Error('Unauthorized');
										
									}
								});
							}
							else throw new Error("Something went wrong!");
						}
					);
			});
		});
	}

	getListVideos(type: string, page) {
		return this.storage.get(APP_LANG).then((lang) => {
			
			return this.http
				.get(this.API_URL + `/Video/${type}/${lang?lang:'en'}/${page}/10`, {}, {})
				//.toPromise()
				.then((res) => {
					let r = JSON.parse(res.data);
					if (r.length > 0) {
						r.map((e) => {
							e.channelImage = 'https://api.the-v.net/site/v2.0/channel?id=' + e.channelId;
							if (lang != 'en') {
								if (e.t_title && e.t_title != '') e.title = e.t_title;
							}
							return e;
						});
					}
					return r;
				},
				(error)=>{
					console.log(error);
					return [];
				})
				.catch((e) => {
					return [];
				});
		});
	}

	async getLikes(id: string) {
		const videoDetails = await this.getDetails(id);
        return videoDetails.likes;
	}

	getRelatedVideos(id: string, count = 5, page = 1): Promise<any> {
		return this.storage.get(APP_LANG).then((lang) => {
			return this.storage.get(USER_DATA_AUTH_KEY).then((auth) => {
				let header = '';
				let uid = '';
				if (auth) {
					header= `${auth.token_type} ${auth.access_token}`;
					uid = auth.aud;
				}
				return this.http
					.get(this.API_URL + `/Video/related/${id}/${lang}/${page}/${count}/${uid}`, {} ,{ Authorization: header })
					.then(
						(res) => {
							let r = JSON.parse(res.data);
							r.map((e) => {
								//e.channelImage = 'https://api.the-v.net/site/v2.0/channel?id=' + e.channelId;
								if (lang != 'en') {
									if (e.t_title && e.t_title != '') e.title = e.t_title;
									if (e.t_desc && e.t_desc != '') e.description = e.t_desc;
								}
								return e;
							});
							return r;
						},
						(err: Response) => {
							if (err.statusText == 'Unauthorized' || err.status == 401) {
								this.userService.refreshAuth().then((r) => {
									if (r) {
										this.getRelatedVideos(id);
									} else {
										throw new Error('Unauthorized');
									}
								});
							}
						}
					);
			});
		});
	}

	getComments(id: string) {
		return this.storage.get(USER_DATA_AUTH_KEY).then((auth) => {
			let header = '';
			let uid = '';
			if (auth) {
				header = `${auth.token_type} ${auth.access_token}`;
				uid = auth.aud;
			}
			return this.http.get(this.API_URL + `/Video/comment/list/${id}/${uid}`, {}, { Authorization: header })
			.then(
				(res) => {
					let r = JSON.parse(res.data);
					r.map((e) => {
						e.avatar = 'https://api.the-v.net/site/v2.0/picture?id=' + e.UserId;
						return e;
					});
					return r;
				},
				(err: Response) => {
					if (err.statusText == 'Unauthorized' || err.status == 401) {
						this.userService.refreshAuth().then((r) => {
							if (r) {
								this.getComments(id);
							} else {
								throw new Error('Unauthorized');
							}
						});
					}
				}
			);
		});
	}

	isDownloaded(id: string, userId: string) {
		return this.downloadService.isVideoDownloaded(userId, id);
	}

	getInProgressDownload(id: string) {
		return this.downloadService.getInProgressDownloads(id);
	}

	// isAddedToPlaylist(id: string, userId: string) {
	// 	return this.playlistService.isVideoAddedToPlaylist(userId, id);
	// }

	hasBeenLiked(id: string, userId: string) {
		return this.preparePlaylistTable()
			.then((db) => {
				return db.executeSql('SELECT * FROM likes WHERE bcid = ? AND memid = ?', [ id, userId ]);
			})
			.then((a) => {
				if (a.rows.length === 1) {
					return true;
				} else if (a.rows.length === 0) {
					return false;
				} else {
					throw new Error('multiple_entries'); // DUPES!
				}
			});
	}
	//TODO: finish this method
	hasBeenNotified(channelId: string, userId: string) {
		return this.prepareNotifiedTable()
			.then((db) => {
				return db.executeSql('SELECT * FROM notifiedChannels WHERE id = ? AND userId = ?', [
					channelId,
					userId
				]);
			})
			.then((a) => {
				if (a.rows.length > 0) {
					return true;
				} else if (a.rows.length === 0) {
					return false;
				} else {
					throw new Error('multiple_entries'); // DUPES!
				}
			});
	}
	getAllChannelNotified(userId) {
		return this.prepareNotifiedTable()
			.then((db) => {
				return db.executeSql('SELECT id,latestDate FROM notifiedChannels WHERE userId = ?', [ userId ]);
			})
			.then((a) => {
				let data = [];
				for (let i = 0; i < a.rows.length; i++) {
					let item = a.rows.item(i);
					data.push(item);
				}
				return data;
			});
	}
	updateChannelNotifiedLatestDate(channelId, userId) {
		this.prepareNotifiedTable()
			.then((db) => {
				return db.executeSql('UPDATE notifiedChannels SET latestDate = ? WHERE id = ? AND userId = ?', [
					Date.now(),
					channelId,
					userId
				]);
			})
			.then((a) => {
				if (a.rowsAffected > 0) {
					console.log('notifiedChannels UPDATED');
				} else if (a.rowsAffected === 0) {
					console.log('notifiedChannels NO DATA UPDATED');
				} else {
					console.error('Error updating data from notifiedChanels table!!!');
				}
			});
	}

	
	notifyChannel(channelId: string, userId: string) {
		return this.prepareNotifiedTable()
			.then((db) => {
				return db.executeSql('INSERT INTO notifiedChannels (id, userId, latestDate)VALUES(?,?,?)', [
					channelId,
					userId,
					Date.now()
				]);
			})
			.then((a) => {
				if (a.rowsAffected > 0) {
					//this.pushNotif.subscribeTo(channelId);
					return true;
				} else if (a.rowsAffected === 0) {
					return false;
				} else {
					throw new Error('Error inserting data from notifiedChanels table!!!');
				}
			});
	}
	removeNotifyChannel(channelId: string) {
		return this.prepareNotifiedTable()
			.then((db) => {
				return db.executeSql('DELETE from notifiedChannels WHERE id = ?', [
					channelId,
				]);
			})
			.then((a) => {
				if (a.rowsAffected > 0) {
					//this.pushNotif.unsubscribeTo(channelId);
					return true;
				} else if (a.rowsAffected === 0) {
					return false;
				} else {
					throw new Error('Error inserting data from notifiedChanels table!!!');
				}
			});
	}

	addLike(id: string, userId: string) {
		return this.preparePlaylistTable()
			.then((db) => {
				return db.executeSql('SELECT * FROM likes WHERE bcid = ? AND memid = ?', [ id, userId ]);
			})
			.then((a) => {
				if (a.rows.length === 1) {
					// this video has already been liked by the user
					return false;
				} else if (a.rows.length === 0) {
                    // this video has not yet been liked by the user
                    return this.http.get(this.API_URL+`/Video/like/${id}`,{},{})
                    .then(()=>{
                        return true;
                    },
                    error=>{
                        return false;
                    })
                    .then((isSuccessful) => {
                        if (isSuccessful) {
                            this.gaSvc.gaEventTracker('Video', 'Like', 'Liked a video');
                            return this.preparePlaylistTable().then((db) => {
                                return db.executeSql('INSERT INTO likes (bcid, memid) VALUES (?, ?)', [
                                    id,
                                    userId
                                ]);
                            });
                        } else {
                            return isSuccessful;
                        }
                    })
                    .then((a) => {
                        if (a.rowsAffected === 1) {
                            return true;
                        } else if (a.rowsAffected === 0) {
                            return false;
                        } else {
                            throw new Error('never_gonna_happen');
                        }
                    });
				} else {
					throw new Error('multiple_entries'); // DUPES!
				}
			});
	}

	addComment(id: string, comment: string) {
        return this.storage.get(USER_DATA_AUTH_KEY)
        .then(auth=>{
            let headers = '';
            
            headers = `${auth.token_type} ${auth.access_token}`;

            let body = {
                "comment": comment
            };
			this.http.setDataSerializer('json');
            return this.http.post(this.API_URL+`/Video/comment/${id}/${auth.aud}`, body, {'Content-Type':'application/json',Authorization : headers})
            .then(
                ()=>{
                    this.gaSvc.gaEventTracker('Video', 'Comment', 'Commneted on a video');
                    return true;
            },
            error=>{
                return false;
            })
        })
	}


	download(id: string, userId: string, userEmail: string) {
		return this.getDetails(id).then((userDetails) => {
			return this.downloadService.addVideoFor(
				userId,
				userEmail,
				id,
				userDetails.title,
				userDetails.channelName,
				userDetails.time,
				userDetails.image
			);
		});
	}

	// private getMappedVideoDetailsArray(videoDetailsArray: VideoDetails[]) {
	// 	return videoDetailsArray.map((videoDetail) => {
	// 		videoDetail.mapped = {
	// 			tags: videoDetail.tags.split(',').map((t) => t.trim()),
	// 			availableLanguages: videoDetail.tags.split(',').map((t) => t.trim()),

	// 			numOfViews: parseInt(videoDetail.views),
	// 			numOfPlays: parseInt(videoDetail.plays),
	// 			numOfPoints: parseInt(videoDetail.points),
	// 			numOfLikes: parseInt(videoDetail.likes),
	// 			numOfComments: parseInt(videoDetail.comments),

	// 			isApproved: videoDetail.isapproved.toLowerCase() === 'true',
	// 			isRecommended: videoDetail.is_recommended.toLowerCase() === 'true',
	// 			isHighlighted: videoDetail.isHighlighted.toLowerCase() === 'true',
	// 			isDownloadable: videoDetail.videoDl.toLowerCase() !== 'locked',
	// 			canBeAccessedAnonymously: videoDetail.videoPrivacy.toLowerCase() === 'public',

	// 			imageUrl: `${videoDetail.image}`,
	// 			channelImageUrl: `https://api.the-v.net/site/v2.0/channel?id=${videoDetail.channelId}`,
	// 			playerUrl: `https://players.brightcove.net/3745659807001/4JJdlFXsg_default/index.html?videoId=${videoDetail.id}`
	// 		};
	// 		return videoDetail;
	// 	});
	// }

	private preparePlaylistTable() {
		return openSqliteDb(this.sqlite).then((db) => {
			return this.createLikesTable(db);
		});
	}

	private createLikesTable(db: SQLiteObject) {
		return new Promise<SQLiteObject>((resolve, reject) => {
			try {
				db
					.executeSql(
						`CREATE TABLE IF NOT EXISTS likes(
                        bcid CHAR(13) NOT NULL,
                        memid CHAR(36) NOT NULL,
                        UNIQUE(bcid, memid))`,
						[]
					)
					.then(() => {
						resolve(db);
					})
					.catch((e) => {
						reject(e);
					});
			} catch (e) {
				reject(e);
			}
		});
	}
	private prepareNotifiedTable() {
		return openSqliteDb(this.sqlite).then((db) => {
			return this.createNotifiedChannelsTable(db);
		});
	}
	private createNotifiedChannelsTable(db: SQLiteObject) {
		return new Promise<SQLiteObject>((resolve, reject) => {
			try {
				db
					.executeSql(
						`CREATE TABLE IF NOT EXISTS notifiedChannels(
                        id INTEGER,
                        userId TEXT NOT NULL,
                        latestDate INTEGER NOT NULL);`,
						[]
					)
					.then(() => {
						resolve(db);
					})
					.catch((e) => {
						reject(e);
					});
			} catch (e) {
				reject(e);
			}
		});
	}
}
