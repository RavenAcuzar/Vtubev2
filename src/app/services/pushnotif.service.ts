import { EventEmitter, Injectable } from '@angular/core';
import { NotifModalPage } from '../../pages/notif-modal/notif-modal';
import { ModalController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { USER_DATA_KEY } from '../app.constants';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite';
import { openSqliteDb } from '../app.utils';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { Notification } from '../models/notification.models';




@Injectable()
export class PushNotificationService {
	private push;
	public event = new EventEmitter();
	public fetchcount = new EventEmitter();
	constructor(private sqlite: SQLite,
		private storage: Storage,
		private localnotification:LocalNotifications,
		private modalCtrl:ModalController
	) {}

	private async prepTopics() {
		let topics = [];
		topics.push('VTUBE_ALL_USERS');
		// topics.push('TEST_TOPIC');
		//get topics array from storage
		const t = await this.localnotification.hasPermission();
		if(!t){
			await this.localnotification.requestPermission();
		}
		const u = await this.storage.get(USER_DATA_KEY);
		if (u) {
			topics.push(u.irid);
			const ch = await this.getAllChannelNotified(u.id);
			ch.forEach((c) => {
				topics.push(c.id);
			});
			return topics;
		} else return topics;
	}
	getAllChannelNotified(userId){
        return this.prepareNotifiedTable().then(db => {
            return db.executeSql('SELECT id,latestDate FROM notifiedChannels WHERE userId = ?', [userId]);
        }).then(a => {
            let data = [];
            for(let i = 0; i < a.rows.length; i++){
                let item = a.rows.item(i);
                data.push(item);
            }
           return data;
        });
	}
	private prepareNotifiedTable(){
        return openSqliteDb(this.sqlite).then(db=>{
            return this.createNotifiedChannelsTable(db);
        });
    }
    private createNotifiedChannelsTable(db: SQLiteObject){
        return new Promise<SQLiteObject>((resolve, reject) => {
            try {
                db.executeSql(`CREATE TABLE IF NOT EXISTS notifiedChannels(
                        id INTEGER,
                        userId TEXT NOT NULL,
                        latestDate INTEGER NOT NULL);`, [])
                    .then(() => { resolve(db); })
                    .catch(e => { reject(e); })
            } catch (e) {
                reject(e);
            }
        });
    }
	init() {
		this.prepTopics().then((topic) => {
			console.log(topic);
			this.push = PushNotification.init({
				android: {
					//senderID: '597577788490',
					topics: topic,
					icon: 'pushicon',
					iconColor: '#07377C'
				},
				ios: {
					alert: 'true',
					badge: true,
					sound: 'false',
					topics: topic
				}
			});
			//will be triggered each time a push notification is received
			this.push.on('notification', (data) => {
				
				if(data.additionalData.coldstart){ //True if app started by pressing notif
					if(data.additionalData.dataid != ''){
						this.navigateToPage('NowPlaying',{id: data.additionalData.dataid})
					}
				}

				if(data.additionalData.foreground){ //if app is on foreground
					//show local notif
					this.localnotification.schedule({
						icon:'res://pushicon',//possible to change to channel icon
						smallIcon:'res://pushicon',
						//image: 'video image url'
						lockscreen: true,
						foreground: true,
						title: data.title,
						text: data.message,
						//sound: isAndroid? 'file://sound.mp3': 'file://beep.caf',
						data: { dataid : data.additionalData.dataid }
					});
					
					this.storage.get(USER_DATA_KEY).then(user=>{
						if(user){
							//save to sqlite
							this.saveToLocal({
								wasRead: 'false',
								type:'Channel',
								date:new Date().toLocaleDateString(),
								message: `New Video from ${data.additionalData.channelName}! ${data.additionalData.vidTitle}`,
								thumbnail:`https://api.the-v.net/site/v2.0/channel?id=${data.additionalData.channelId}`,
								userId:user.id,
								data:data.additionalData.dataid,
							});
							let r = {
								message: `New Video from ${data.additionalData.channelName}! ${data.additionalData.vidTitle}`,
								thumbnail:`https://api.the-v.net/site/v2.0/channel?id=${data.additionalData.channelId}`,
								data:data.additionalData.dataid
							}
							console.log(r);
							//show modal on app
							let g = this.modalCtrl.create(NotifModalPage,{data:r});
							g.present();
							setTimeout(()=>{g.dismiss()},3000);
						}
					});
				}
				else{
					//if app is in background
					this.storage.get(USER_DATA_KEY).then(user=>{
						if(user){
							this.saveToLocal({
								wasRead: 'false',
								type:'Channel',
								date:new Date().toLocaleDateString(),
								message: `New Video from ${data.additionalData.channelName}! ${data.additionalData.vidTitle}`,
								thumbnail:`https://api.the-v.net/site/v2.0/channel?id=${data.additionalData.channelId}`,
								userId:user.id,
								data:data.additionalData.dataid,
							})
						}
					})
					
				}
			});

			//will be triggered on each successful registration
			this.push.on('registration', (data) => {
				console.log("Push Succeess", data.registrationId);
				//console.log(data.);
			});

			//will trigger when an internal error occurs
			this.push.on('error', (e) => {
				console.log("Push Error: ",e);
			});
		});
	}
	getCountEvent(){
		this.fetchcount.next();
	}
	navigateToPage(page, params){
		this.event.next({page:page,params:params})
	}

	subscribeTo(topic: string) {
		return this.push.subscribe(
			topic,
			() => {
				console.log('success');
				return true;
			},
			() => {
				console.log('error');
				return false;
			}
		);
	}
	unsubscribeTo(topic: string) {
		return this.push.unsubscribe(
			topic,
			() => {
				console.log('success');
				return true;
			},
			() => {
				console.log('error');
				return false;
			}
		);
	}
	clearSubs(){
		return this.prepTopics().then(t=>{
			let i =t.indexOf('VTUBE_ALL_USERS')
			t.splice(i,1);
			return this.push.unregister(()=>{
				console.log('ok')
				return true;
			},()=>{
				console.log('error unregister')
				return false;
			},
			t)
		})
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
				this.getCountEvent();
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
			return this.createNotifTable(db);
		});
	}

	private createNotifTable(db: SQLiteObject) {
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
