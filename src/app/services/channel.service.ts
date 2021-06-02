import { Injectable } from '@angular/core';

import { Storage } from '@ionic/storage';
import { USER_DATA_AUTH_KEY, USER_DATA_KEY } from '../app.constants';
import { numberFormat } from '../app.utils';
import { UserService } from './user.service';
import { HTTP } from '@ionic-native/http';

@Injectable()
export class ChannelService {
	private API_URL = 'https://api.the-v.net';

	constructor(private http: HTTP, private storage: Storage, private userService: UserService) {}

	getDetailsOf(id:number) {
		if (id) {
			return this.http.get(this.API_URL + `/channel/${id}`,{},{}).then((res) => {
				console.log(res);
				let chs = JSON.parse(res.data);
				if (chs.length > 0) {
					chs.map((ch) => {
						ch.chViews = numberFormat(ch.views);
						ch.chVidsCount = numberFormat(ch.numVideos);
						ch.chFollowers = numberFormat(ch.followers);
						return ch;
					});
					return chs[0];
				} else {
					return false;
				}
			});
		} else return Promise.resolve(false);
	}

	getUserChannelDetails(){
		
		return this.storage.get(USER_DATA_AUTH_KEY).then((auth) => {
			let headers =  '';
			headers = `${auth.token_type} ${auth.access_token}`;

			return this.http
				.get(this.API_URL + `/Dashboard/channel/list/${auth.aud}`, {}, { Authorization : headers })
				.then(
					(res) => {
						console.log(res);
						let chs = JSON.parse(res.data);
						if (chs.length > 0) {
							chs.map((ch) => {
								ch.chViews = numberFormat(ch.views);
								ch.chVidsCount = numberFormat(ch.numVideos);
								ch.chFollowers = numberFormat(ch.followers);
								return ch;
							});
							return chs[0];
						} else {
							return false;
						}
					},
					(err) => {
						console.log(err);
						if (err.statusText == 'Unauthorized' || err.status == 401) {
							this.userService.refreshAuth().then((r) => {
								if (r) {
									this.getUserChannelDetails();
								} else {
									throw new Error('Unauthorized');
								}
							});
						}
					}
				);
		});
		
	}

	follow(id: number) {
		return this.storage.get(USER_DATA_AUTH_KEY).then((auth) => {
			let headers =  '';
			headers = `${auth.token_type} ${auth.access_token}`;

			return this.http
				.post(this.API_URL + `/Dashboard/follow/${id}/${auth.aud}`, {}, { Authorization : headers })
				.then(
					(res) => {
						console.log(res.data == "\"True\"");
						if (res.data == "\"True\"") {
							return 'SUCCESS';
						} else if (res.data == "\"False\"") {
							return 'REQUEST SENT';
						} else {
							throw new Error('Something went wrong!');
						}
					},
					(err) => {
						console.log(err);
						if (err.statusText == 'Unauthorized' || err.status == 401) {
							this.userService.refreshAuth().then((r) => {
								if (r) {
									this.follow(id);
								} else {
									throw new Error('Unauthorized');
								}
							});
						}
					}
				);
		});
	}

	unfollow(id: number) {
		return this.storage.get(USER_DATA_AUTH_KEY).then((auth) => {
			let headers =  '';
			headers = `${auth.token_type} ${auth.access_token}`;

			return this.http
				.post(this.API_URL + `/Dashboard/unfollow/${id}/${auth.aud}`, {}, { Authorization : headers })
				.then(
					(_res) => {
						return true;
					},
					(err) => {
						console.log(err);
						if (err.statusText == 'Unauthorized' || err.status == 401) {
							this.userService.refreshAuth().then((r) => {
								if (r) {
									this.follow(id);
								} else {
									throw new Error('Unauthorized');
								}
							});
						} else return false;
					}
				);
		});
	}
	async getUserFollowedChannels() {
		try{
			const auth = await this.storage.get(USER_DATA_AUTH_KEY);
			let headers =  '';
			headers = `${auth.token_type} ${auth.access_token}`;
			let chs = await this.http.get(this.API_URL + `/Dashboard/followchannel/list/${auth.aud}`, {},{ Authorization : headers });
			let c = await JSON.parse(chs.data).reduce(async (acc,cur)=>{
				let ch = await this.getDetailsOf(cur.channel_id);
				if(ch!=null){
					cur.channelName = ch.name;
					cur.followers = ch.followers;
					cur.thumbnail = 'https://api.the-v.net/site/v2.0/channel?id=' + cur.channel_id;
					(await acc).push(cur);
				} 
				return (await acc);
			},Promise.resolve([]));
			return c;
		}
		catch (err){
			console.log(err);
			if (err.statusText == 'Unauthorized' || err.status == 401) {
				this.userService.refreshAuth().then((r) => {
					if (r) {
						this.getUserFollowedChannels();
					} else {
						throw new Error('Unauthorized');
					}
				});
			} else throw new Error('Something went wrong');
		}
	}

	isFollowing(channelId: number): Promise<boolean> {
		return this.getUserFollowedChannels()
			.then((chs) => {
				if(chs)
				return chs.some((c) => c.channel_id === channelId);
			})
			.catch((_err) => {
				return false;
			});
	}

	// async getUserChannel() {
	// 	//return user's channel
	// 	let data = await this.storage.get(USER_DATA_KEY);
	// 	if (data.channelID !== '') {
	// 		let r = await this.http.get(this.API_URL + `/channel/${data.channelID}`,{},{});
	// 		return JSON.parse(r.data)[0];
	// 	} else throw new Error('NO_CHANNEL_FOUND');
	// }

	getChannelVideos(channelId, page, count = 10) {
		//return videos from channel
		return this.storage.get(USER_DATA_AUTH_KEY).then((auth) => {
			let header =  '';
			let uid = '';
			if (auth) {
				header = `${auth.token_type} ${auth.access_token}`;
				uid = auth.aud;
			}
			return this.http
				.get(this.API_URL + `/channel/video/list/${channelId}/${page}/${count}/${uid}`, {},{ Authorization: header })
			
				.then(
					(res) => {
						return JSON.parse(res.data);
					},
					(err: Response) => {
						if (err.statusText == 'Unauthorized' || err.status == 401) {
							this.userService.refreshAuth().then((r) => {
								if (r) {
									this.getChannelVideos(channelId,page);
								} else {
									throw new Error('Unauthorized');
								}
							});
						} else throw new Error('Something went wrong!');
					}
				);
		});
	}
	getChannelRecommended(page, count = 10) {
		//return recommended channels
		return this.http.get(this.API_URL + `/channel/recommend/${page}/${count}`,{},{}).then(
			(res) => {
				return JSON.parse(res.data);
			},
			(_err) => {
				throw new Error('Something went wrong!');
			}
		);
	}
	getAllChannels(page, count = 10) {
		//return all channels
		return this.http.get(this.API_URL + `/channel/${page}/${count}`,{},{}).then(
			(res) => {
				return JSON.parse(res.data);
			},
			(_err) => {
				throw new Error('Something went wrong!');
			}
		);
	}
}
