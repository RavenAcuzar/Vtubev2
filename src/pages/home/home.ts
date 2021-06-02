import { Component, ViewChild } from '@angular/core';
import {
	NavController,
	PopoverController,
	InfiniteScroll,
	AlertController,
	Content,
	LoadingController
} from 'ionic-angular';
import { HomePopoverPage } from '../../app/popover';

import { SearchPage } from '../search/search';
import { FallbackPage } from '../fallback/fallback';
import { Storage } from '@ionic/storage';
import { IS_LOGGED_IN_KEY, USER_DATA_KEY, APP_LANG } from '../../app/app.constants';
import { GoogleAnalyticsService } from '../../app/services/analytics.service';

import { NotificationsPage } from '../notifications/notifications';
import { VideoService } from '../../app/services/video.service';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { PushNotificationService } from '../../app/services/pushnotif.service';
import { NowPlayingPage } from '../now-playing/now-playing';

@Component({
	selector: 'page-home',
	templateUrl: 'home.html'
})
export class HomePage {
	@ViewChild(Content) content: Content;
	freeVids = [];
	premiumVids = [];
	channelDetail;
	numFreevids = 1;
	numPremvids = 1;
	vidType: string = 'freeVid';
	notifCount = 0;
	isLogged = false;
	
	constructor(
		public navCtrl: NavController,
		protected popoverCtrl: PopoverController,
		private storage: Storage,
		private alertCtrl: AlertController,
		private gaSvc: GoogleAnalyticsService,
		private loadingCtrl: LoadingController,
		private pushnotif: PushNotificationService,
		private vidSvc: VideoService,
		private localnotification: LocalNotifications
	) {
		this.gaSvc.gaTrackPageEnter('Home');
		this.pushnotif.fetchcount.subscribe(() => {
			this.storage.get(IS_LOGGED_IN_KEY).then((loggedIn) => {
				if (loggedIn) {
					this.pushnotif.getNewNotifCount().then((c) => {
						this.notifCount = c;
					});
				}
			});
		});
	}
	scrollToTop() {
		this.content.scrollTo(0, 0, 0);
	}
	async ionViewDidLoad() {
		let loading = this.loadingCtrl.create({
			spinner: 'crescent',
			cssClass: 'my-loading-class'
		});
		loading.present();
		let l = await this.storage.get(IS_LOGGED_IN_KEY);
		console.log(l);
		this.isLogged=l;

		if (this.isLogged) {
			let c = await this.pushnotif.getNewNotifCount()
			console.log(c);
			this.notifCount = c;
		}

		this.localnotification.on('click').subscribe((notif) => {
			console.log(notif);
			if (notif.data.dataid != '') {
				this.navCtrl.push(NowPlayingPage, { id: notif.data.dataid });
			}
		});
		await this.getFreeVids(this.numFreevids.toString());
		console.log(this.freeVids);
		await this.getPremVids(this.numPremvids.toString());
		console.log(this.premiumVids);
		loading.dismiss();
		
	}
	presentPopover(myEvent, vids) {
		let popover = this.popoverCtrl.create(HomePopoverPage, {
			videoDetails: vids
		});
		popover.present({
			ev: myEvent
		});
	}

	loadMoreFree(infiniteScroll: InfiniteScroll) {
		this.numFreevids += 1;
		this.getFreeVids(this.numFreevids.toString(), () => {
			infiniteScroll.complete();
			
		});
	}
	loadMorePrem(infiniteScroll: InfiniteScroll) {
		this.numPremvids += 1;
		this.getPremVids(this.numPremvids.toString(), () => {
			infiniteScroll.complete();

			
			
		});
	}

	getPremVids(num, callback?, isRefresh?: boolean) {
		return this.vidSvc.getListVideos('nonfree', num).then((vids) => {
			if (vids.length > 0) {
				if (isRefresh) {
					this.premiumVids = [];
				}
				this.premiumVids.push(...vids);
				if (callback) callback();
			}
		});
	}

	goToNotifs() {
		this.navCtrl.setRoot(NotificationsPage);
	}
	doRefresh(refresher, type) {
		if (type === 'free') {
			this.numFreevids = 1;

			this.getFreeVids(
				this.numFreevids,
				() => {
					refresher.complete();
				},
				true
			);
		} else if (type === 'premium') {
			this.numPremvids = 1;

			this.getPremVids(
				this.numPremvids,
				() => {
					refresher.complete();
				},
				true
			);
		}

		
	}

	getFreeVids(num, callback?, isRefresh?: boolean) {
		return this.vidSvc.getListVideos('free', num).then((vids) => {
			if (vids.length > 0) {
				if (isRefresh) {
					this.freeVids = [];
				}
				this.freeVids.push(...vids);
				if (callback) callback();
			}
		});
	}

	playVideo(id: string, videoPrivacy: string) {
		this.storage.get(IS_LOGGED_IN_KEY).then((loggedIn) => {
			if (videoPrivacy == 'public') {
				//go to vid
				this.navCtrl.push(NowPlayingPage, {
					id: id
				});
			} else if (!loggedIn && videoPrivacy == 'private') {
				//go to fallback
				this.goToFallback();
			} else if (loggedIn && videoPrivacy == 'private') {
				//check subscription
				this.userCheckSubscription().then((sub) => {
					if (sub) {
						this.navCtrl.push(NowPlayingPage, {
							id: id
						});
					} else {
						let alert = this.alertCtrl.create({
							title: 'Upgrade to premium',
							message: 'Upgrade to premium account to access this feature.',
							buttons: [
								{
									text: 'OK',
									handler: () => {
										alert.dismiss();
										return false;
									}
								}
							]
						});
						alert.present();
					}
					//if true go to vid
					//else show alert- prompt user to upgrade subscrption
				});
			}
		});
	}
	userCheckSubscription() {
		return this.storage.get(USER_DATA_KEY).then((userDetails) => {
			return userDetails.membership !== 'Free';
		});
	}
	searchThing() {
		this.navCtrl.push(SearchPage);
	}
	goToFallback() {
		this.navCtrl.push(FallbackPage);
	}
}
