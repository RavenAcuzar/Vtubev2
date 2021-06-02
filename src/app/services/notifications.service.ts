import { Injectable } from '@angular/core';
import { formatDate, openSqliteDb } from '../app.utils';
import { SQLiteObject, SQLite } from '@ionic-native/sqlite';
import { VideoService } from './video.service';
import { Storage } from '@ionic/storage';
import { USER_DATA_KEY } from '../app.constants';
import { Notification } from '../models/notification.models';
import { ModalController, ToastController } from 'ionic-angular';
import { NotifModalPage } from '../../pages/notif-modal/notif-modal';
import { HTTP } from '@ionic-native/http';

@Injectable()
export class NotificationService {
	private options;
	private apiURL = 'https://bt.the-v.net/service/api.aspx';
	constructor(
		private http: HTTP,
		private sqlite: SQLite,
		private vidSvc: VideoService,
		private storage: Storage,
		private toastCtrl: ToastController,
		private modalCtrl: ModalController
	) {
		this.options = {
			'Content-Type':'application/x-www-form-urlencoded'
		}
		
	}

	async fetch(isBackground?: boolean) {
		//fetch notifications from api and local
		const t = await this.getLatestVidsFromSubscirbedChannels();
		console.log(t);
		if(isBackground){
			console.log(isBackground);
			const newNotif = await this.getNewNotifCount();
			console.log(newNotif);
			if(newNotif == 1){
				console.log("ONE HERE!!")
				this.getAllNotif(true).then(r=>{
					console.log(r);
					let g = this.modalCtrl.create(NotifModalPage,{data:r});
					g.present();
					setTimeout(()=>{g.dismiss()},3000);
				});
			}
			else if (newNotif > 0) {
				let t = this.toastCtrl.create({
					message: 'You have ' + newNotif + ' new notifications.',
					duration: 1500,
					position: 'bottom'
				});
				t.present();
			}
			return newNotif;
		} 
	}
	private async apiGetLatestVidOfchnnel(id,date){
		let body = {
			"action": 'VtubeGetChannelLatestVid',
			"channelId": id,
			"date":formatDate(new Date(date))
		}
		let res = await this.http
		.post(
			this.apiURL,
			body,
			this.options
		);
		return JSON.parse(res.data);
	}
	private async getLatestVidsFromSubscirbedChannels() {
		//get user Info for ID
		const userinfo = await this.storage.get(USER_DATA_KEY);
		const channels = await this.vidSvc.getAllChannelNotified(userinfo.id);
		return await this.apiGetLatest(channels, userinfo.id);
	}

	async apiGetLatest(channels,id){
		if (channels.length > 0) {
			for(let i = 0; i < channels.length; i++){
				await this.apiGetLatestVidOfchnnel(channels[i].id,channels[i].latestDate)
				.then(res=>{
					let r = res;
						if (r.length > 0) {
							for (let i = 0; i < r.length; i++) {
								this.saveToLocal({
									wasRead: 'false',
									type: 'Channel',
									date: new Date().toLocaleDateString(),
									message: 'New video from ' + r[i].channelName + '! ' + r[i].title,
									thumbnail: 'https://api.the-v.net/site/v2.0/channel?id=' + r[i].channelId,
									userId: id,
									data: r[i].id
								});
								//update latestDate from notifiedChannels table
								this.vidSvc.updateChannelNotifiedLatestDate(r[i].channelId, id);
							}
						}
				});
				if (i + 1 >= channels.length) {
					return "Done fetch";
				}
			}
		}
	}

	private checkAccountSubsExpiry() {
		return this.storage.get(USER_DATA_KEY).then((userinfo) => {
			let days_left = Math.floor((Date.parse(userinfo.membershipExpiry) - Date.now()) / 1000 / 60 / (60 * 24));
			if (days_left <= 10) {
				this.saveToLocal({
					wasRead: 'false',
					type: 'Account',
					date: new Date().toLocaleDateString(),
					message:
						'Your account is expiring in ' +
						days_left.toString() +
						'! Renew your subscription to continue enjoying premium content!',
					thumbnail: userinfo.finalAvatarUrl,
					userId: userinfo.id
				});
			}
		});
	}

	saveToLocal(n: Notification) {
		//save notifications to sqlite
		this.prepareNotificationsTable()
			.then((db) => {
				return db.executeSql(
					'INSERT INTO notifications (wasRead,type,date,message,thumbnail,userId, data) VALUES ( ?, ?, ?, ?, ?, ?, ?)',
					[ n.wasRead, n.type, n.date, n.message, n.thumbnail, n.userId, n.data ]
				);
			})
			.then((r) => {
				console.log(r.rowsAffected);
			});
	}
	getNewNotifCount() {
		//return count of New/unread notifs
		return this.storage.get(USER_DATA_KEY).then((userinfo) => {
			return this.prepareNotificationsTable()
				.then((db) => {
					return db.executeSql("SELECT COUNT(*) as TOTAL FROM notifications WHERE wasRead = 'false' AND userId = ?", [
						userinfo.id
					]);
				}).catch(e=>{
					console.log(e);
				})
				.then((r) => {
					console.log(r.rows.item(0).TOTAL);
					return r.rows.item(0).TOTAL;
				}).catch(e=>{
					console.log(e);
				})
		});
	}
	//call on notification page leave, for individual noti, notifId=id
	setAllNotifAsRead(notifId?) {
		return this.storage.get(USER_DATA_KEY).then((userinfo) => {
			return this.prepareNotificationsTable()
				.then((db) => {
					if (notifId == null)
						return db.executeSql("UPDATE notifications set wasRead='true' WHERE userId = ?", [
							userinfo.id
						]);
					else
						return db.executeSql("UPDATE notifications set wasRead='true' WHERE userId = ? AND id = ?", [
							userinfo.id,
							notifId
						]);
				})
				.then((r) => {
					if (r.rowsAffected > 0) {
						return true;
					} else if (r.rowsAffected === 0) {
						return false;
					} else throw new Error('Problem Updating data from notifications table');
				});
		});
	}
	async getAllNotif(unread?:boolean) {
		//return all notifications from local
		//await this.fetch();
		if(unread){
			return this.storage.get(USER_DATA_KEY).then((userinfo) => {
				return this.prepareNotificationsTable()
					.then((db) => {
						return db.executeSql("SELECT * FROM notifications WHERE userId = ? AND wasRead='false' LIMIT 1", [ userinfo.id ]);
					})
					.then((r) => {
						console.log(r);
						return r.rows.item(0);	
					});
			});
		}
		else{
			return this.storage.get(USER_DATA_KEY).then((userinfo) => {
			return this.prepareNotificationsTable()
					.then((db) => {
						return db.executeSql('SELECT * FROM notifications WHERE userId = ? ORDER BY id DESC', [ userinfo.id ]);
					})
					.then((r) => {
						let data = [];
						for (let i = 0; i < r.rows.length; i++) {
							let item = r.rows.item(i);
							data.push(item);
						}
						return data;
					});
			});
		}
	}
	deleteNotif(notifID) {
		//delete notif from local
		return this.prepareNotificationsTable()
			.then((db) => {
				return db.executeSql('DELETE FROM notifications WHERE id = ?', [ notifID ]);
			})
			.then((r) => {
				if (r.rowsAffected > 0) {
					return true;
				} else if (r.rowsAffected === 0) {
					return false;
				} else throw new Error('Problem Removing data from notifications table');
			});
	}

	private prepareNotificationsTable() {
		return openSqliteDb(this.sqlite).then((db) => {
			return this.createNotifiedChannelsTable(db);
		});
	}
	//'data' can be a video id to redirect to when notification is clicked, to any action to do on notification click
	//'type' type of notification ('Account', 'Channel')
	//Account = account based notifications ex. user subsciption expiring
	//Channel = new video uploaded from channel.

	private createNotifiedChannelsTable(db: SQLiteObject) {
		return new Promise<SQLiteObject>((resolve, reject) => {
			try {
				db
					.executeSql(
						`CREATE TABLE IF NOT EXISTS notifications(
                        id INTEGER PRIMARY KEY,
                        wasRead TEXT NOT NULL,
                        type TEXT NOT NULL,
                        date TEXT NOT NULL,
                        message TEXT NOT NULL,
                        thumbnail TEXT NOT NULL,
                        userId TEXT NOT NULL,
                        data TEXT   
                    );`,
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
