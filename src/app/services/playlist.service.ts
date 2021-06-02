import { Injectable } from '@angular/core';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite';
import { USER_DATA_AUTH_KEY } from '../app.constants';
import { openSqliteDb } from '../app.utils';
import { PlaylistEntry } from '../models/playlist.models';
import { GoogleAnalyticsService } from './analytics.service';
import { Storage } from '@ionic/storage';
import { UserService } from './user.service';
import { HTTP } from '@ionic-native/http';



@Injectable()
export class PlaylistService {
	private API_URL = 'https://api.the-v.net';
	constructor(
		private sqlite: SQLite,
		private gaSvc: GoogleAnalyticsService,
		private storage: Storage,
		private http: HTTP,
		private userSvc: UserService
	) {}
	

	getUserPlaylistFromApi() {
		this.storage.get(USER_DATA_AUTH_KEY).then((auth) => {
			let header = '';
			header = `${auth.token_type} ${auth.access_token}`;
			this.http
				.get(this.API_URL + `/dashboard/playlist/list/${auth.aud}`, {} , { Authorization: header })
				.then((res) => {
					let r = JSON.parse(res.data);
					console.log(r);
					r.forEach((e) => {
						this.addVideoFor(auth.aud, e, true)
							.then((_) => {
								console.log('Added!');
							})
							.catch((e) => {
								console.log(e);
							});
					});
				});
		});
	}

	getPlaylistOf(userId: string) {
		return this.preparePlaylistTable()
			.then((db) => {
				return db.executeSql(`SELECT * FROM playlist WHERE memid = ? ORDER BY id DESC`, [ userId ]);
			})
			.then((a) => {
				return new Promise<PlaylistEntry[]>((resolve, reject) => {
					try {
						let playlistEntries: PlaylistEntry[] = [];
						for (let i = 0; i < a.rows.length; i++) {
							let playlistEntry = <PlaylistEntry>a.rows.item(i);
							playlistEntries.push(playlistEntry);
						}
						resolve(playlistEntries);
					} catch (e) {
						reject(e);
					}
				});
			});
	}

	isVideoAddedToPlaylist(userId: string, bcid: string) {
		return this.preparePlaylistTable()
			.then((db) => {
				return db.executeSql(`SELECT * FROM playlist WHERE memid = ? and bcid = ?`, [ userId, bcid ]);
			})
			.then((a) => {
				return a.rows.length > 0;
			});
	}

	addVideoFor(userId: string, vid, init?) {
		return this.checkIfVideoIsInPlaylistOf(userId, vid.bcid)
			.then((isInPlaylist) => {
				if (!isInPlaylist) return this.preparePlaylistTable();
				else throw new Error('already_in_playlist');
			})
			.then((db) => {
				if (init) {
					console.log(vid);
					return db.executeSql(`INSERT INTO playlist(bcid,title,image,views,duration,memid) VALUES(?, ?,?,?,?,?)`, [ vid.bcid, vid.name, vid.image.substring(`/Widgets_Tube/VideoImage.ashx?id=${vid.bcid}&amp;image=`.length), vid.view,vid.duration,userId ]);
				} else {
					return this.storage.get(USER_DATA_AUTH_KEY).then((auth) => {
						let header = '';
						header = `${auth.token_type} ${auth.access_token}`;
						return this.http
							.post(this.API_URL + `/dashboard/playlist/add/${vid.bcid}/${auth.aud}`, {} , { Authorization: header })
							.then(
								() => {
									return db.executeSql(`INSERT INTO playlist(bcid,title,image,views,duration, memid) VALUES(?,?,?,?,?,?)`, [ vid.bcid, vid.name, vid.image, vid.views,vid.time,userId ]);
								},
								(err: Response) => {
									if (err.statusText == 'Unauthorized' || err.status == 401) {
										this.userSvc.refreshAuth().then((r) => {
											if (r) {
												return 'Redirect';
											} else {
												throw new Error('Unauthorized');
											}
										});
									} else throw new Error('Something went wrong!');
								}
							);
					});
				}
			})
			.then((a) => {
				if (a == 'Redirect') {
					this.addVideoFor(userId, vid.bcid);
				} else {
					return new Promise<boolean>((resolve, reject) => {
						if (a.rowsAffected === 1) {
							this.gaSvc.gaEventTracker('Video', 'Add to Playlist', 'Video added to playlist');
							resolve(true);
						} else if (a.rowsAffected === 0) resolve(false);
						else reject({ error: 'Multiple values were added!' });
					});
				}
			});
	}

	removeVideoFromPlaylist(bcid: string) {
		return this.preparePlaylistTable()
			.then((db) => {
				return db.executeSql(`DELETE FROM playlist WHERE bcid = ?`, [ bcid ]);
			})
			.then((a) => {
				return new Promise<boolean>((resolve, reject) => {
					if (a.rowsAffected === 1) {
						this.storage.get(USER_DATA_AUTH_KEY).then((auth) => {
							let header = '';
							header = `${auth.token_type} ${auth.access_token}`;
							return this.http
								.post(
									this.API_URL + `/dashboard/playlist/remove/${bcid}/${auth.aud}`,
									{},
									{ Authorization: header }
								)
								.then(
									() => {
										resolve(true);
									},
									(err: Response) => {
										if (err.statusText == 'Unauthorized' || err.status == 401) {
											this.userSvc.refreshAuth().then((r) => {
												if (r) {
													this.removeVideoFromPlaylist(bcid);
												} else {
													reject({ error: 'Unauthorized!' });
												}
											});
										} else reject({ error: 'Something went wrong!' });
									}
								);
						});
					} else if (a.rowsAffected === 0) resolve(false);
					else reject({ error: 'Multiple values were deleted!' });
				});
			});
	}

	checkIfVideoIsInPlaylistOf(userId: string, bcid: string) {
		return this.preparePlaylistTable()
			.then((db) => {
				return db.executeSql(`SELECT * FROM playlist WHERE memid = ? and bcid = ?`, [ userId, bcid ]);
			})
			.then((a) => {
				return new Promise<boolean>((resolve, reject) => {
					resolve(a.rows.length === 1);
				});
			});
	}

	private preparePlaylistTable() {
		return openSqliteDb(this.sqlite).then((db) => {
			return this.createPlaylistTable(db);
		});
	}

	private createPlaylistTable(db: SQLiteObject) {
		return new Promise<SQLiteObject>((resolve, reject) => {
			try {
				db
					.executeSql(
						`CREATE TABLE IF NOT EXISTS playlist(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
					bcid CHAR(13) NOT NULL,
					title TEXT NOT NULL,
					image TEXT NOT NULL,
					views TEXT NOT NULL,
					duration TEXT NOT NULL,
                    memid CHAR(36) NOT NULL)`,
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
