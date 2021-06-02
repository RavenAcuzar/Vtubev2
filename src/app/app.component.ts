import { Component, ViewChild } from '@angular/core';
import { Nav, Platform, AlertController, Events, ToastController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { TranslateService } from '@ngx-translate/core';

import { HomePage } from '../pages/home/home';
import { ProfilePage } from '../pages/profile/profile';
import { ChannelsPage } from '../pages/channels/channels';
import { PlaylistPage } from '../pages/playlist/playlist';
import { DownloadsPage } from '../pages/downloads/downloads';
import { LoginPage } from '../pages/login/login';
import { FallbackPage } from '../pages/fallback/fallback';
import { Storage } from '@ionic/storage';
import { IS_LOGGED_IN_KEY, USER_DATA_KEY, APP_LANG, APP_VER } from './app.constants';
import { AppStateService } from './services/app_state.service';
import { ConnectionService } from './services/network.service';
import { Network } from '@ionic-native/network';
import { UploadVideoPage } from '../pages/upload-video/upload-video';
import { Deeplinks } from '@ionic-native/deeplinks';
import { SelectLangPage } from '../pages/select-lang/select-lang';
import { ScreenOrientation } from '@ionic-native/screen-orientation';
import { PushNotificationService } from './services/pushnotif.service';
import { NotificationsPage } from '../pages/notifications/notifications';
import { UserService } from './services/user.service';
import { PlaylistService } from './services/playlist.service';
import { NowPlayingPage } from '../pages/now-playing/now-playing';
import { HTTP } from '@ionic-native/http';

@Component({
	templateUrl: 'app.html'
})
export class MyApp {
	@ViewChild(Nav) nav: Nav;

	rootPage: any = HomePage;
	activePage: any;
	username: string = ' ';
	email: string = ' ';
	points: string = '0';
	avatar: string = ' ';
	private didLoginHadErrors = false;
	pageState: boolean;
	menuSide: string = 'left';
	pages: Array<{ title: string; component: any; icon: string }> = [];

	constructor(
		public platform: Platform,
		public statusBar: StatusBar,
		public splashScreen: SplashScreen,
		public alertCtrl: AlertController,
		private events: Events,
		private storage: Storage,
		private network: Network,
		private toastCtrl: ToastController,
		private connectionSrvc: ConnectionService,
		private deeplinks: Deeplinks,
		private translateSvc: TranslateService,
		private screenOrientation: ScreenOrientation,
		private pushSvc: PushNotificationService,
		private userSvc: UserService,
		private playlistSvc:PlaylistService,
		private http:HTTP
	) {
		this.initializeApp();
		this.updateMenu();
		this.activePage = this.pages[0];
		events.subscribe(AppStateService.UPDATE_MENU_STATE_EVENT, (_) => {
			this.updateMenu();
		});
	}

	initializeApp() {
		this.platform.ready().then(() => {
			// Okay, so the platform is ready and our plugins are available.
			// Here you can do any higher level native things you might need.
			this.statusBar.styleDefault();
			this.nav.setRoot(HomePage);
			this.deeplinks
				.routeWithNavController(this.nav, {
					'/vid/:id': NowPlayingPage
				})
				.subscribe(
					(match) => {
						console.log('Successfully matched route', match);
					},
					(nomatch) => {
						console.error("Got a deeplink that didn't match", nomatch);
					}
				);
			this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.PORTRAIT);
			if (this.network.type === 'none') {
				let toast = this.toastCtrl.create({
					message: "You're Offline. Check your internet connection.",
					position: 'bottom'
				});
				toast.present();
				this.connectionSrvc.setActiveToast(toast);
			}
			this.connectionSrvc.checkNetworkConnection();
			
			this.storage.get(APP_LANG).then((lang) => {
				if (lang != null) {
					this.translateSvc.setDefaultLang(lang);
					this.translateSvc.use(lang);
					if (lang == 'ar') {
						this.platform.setDir('rtl', true);
						//this.platform.setDir('ltr', false);
					}
				} else {
					this.translateSvc.setDefaultLang('en');
					this.translateSvc.use('en');
					this.storage.set(APP_LANG, 'en');
				}
			});

			this.pushSvc.init();
			this.pushSvc.event.subscribe(data=>{
				console.log(data);
				this.nav.push(NowPlayingPage,data.params)
			});
			this.platform.registerBackButtonAction(() => {
				if (this.nav.length() == 1) {
					let alert = this.alertCtrl.create({
						title: 'Exit VTube?',
						message: 'Are you sure you want to exit Vtube?',
						buttons: [
							{
								text: 'Cancel',
								role: 'cancel',
								handler: () => {}
							},
							{
								text: 'OK',
								handler: () => {
									this.platform.exitApp();
								}
							}
						]
					});
					alert.present();
				} else this.nav.pop();
			});
		});
		this.checkVersion();
		this.splashScreen.hide();
		
	}

	openPage(page) {
		// Reset the content nav to have just this page
		// we wouldn't want the back button to show in this scenario
		console.log(this.platform.isRTL);
		if (page.component == FallbackPage) {
			this.nav.push(page.component);
		} else {
			this.nav.setRoot(page.component);
			this.activePage = page;
		}
	}
	checkVersion(){
		this.storage.get(APP_VER).then(ver=>{
			this.http.get("https://api.the-v.net/app/version?id=vtube",{},{})
			.then(res=>{
				console.log("VERSION", ver);
				let v = JSON.parse(res.data);
				if(!ver || v[0].version == ver){
					this.storage.set(APP_VER, v[0].version);
				}
				else if(v[0].version > ver){
					//show alert
					let alert = this.alertCtrl.create({
						title: "New Update Available!",
						message: "A new version of Vtube is available! Please update your app to prevent issues!",
						buttons: [{
							text: "OK",
							role: 'cancel',
							handler: ()=>{
								alert.dismiss();
								return false;
							}
						}]
					});
					alert.present();
				}
			})
		})
	}

	updateMenu() {
		this.didLoginHadErrors = false;
		let errCallback = (e) => {
			this.didLoginHadErrors = true;
		};
		this.storage
			.get(IS_LOGGED_IN_KEY)
			.then((isloggedin) => {
				if (isloggedin) {
					this.pages = [
						{ title: 'HOME', component: HomePage, icon: 'md-home' },
						{ title: 'PROFILE', component: ProfilePage, icon: 'md-person' },
						{ title: 'NOTIFICATIONS', component: NotificationsPage, icon: 'md-megaphone' },
						{ title: 'CHANNELS', component: ChannelsPage, icon: 'md-easel' },
						//{ title: 'INBOX', component: InboxPage, icon: "md-mail" },
						{ title: 'UPLOAD_VID', component: UploadVideoPage, icon: 'md-videocam' },
						{ title: 'PLAYLIST_M', component: PlaylistPage, icon: 'md-albums' },
						{ title: 'DOWNLOAD', component: DownloadsPage, icon: 'md-download' },
						//{ title: 'CHAT', component: VoltChatPage, icon: "ios-text" },
						{ title: 'SELECT_LANG', component: SelectLangPage, icon: 'md-settings' }
					];

					this.storage.get(USER_DATA_KEY).then((userDetails) => {
						console.log(userDetails);
						this.username = userDetails.first_name;
						this.email = userDetails.email;
						this.points = userDetails.points;
						this.avatar = 'https://api.the-v.net/site/v2.0/picture?id=' + userDetails.id;
						this.pushSvc.subscribeTo(userDetails.irid);
					});
					this.pageState = isloggedin;
					this.playlistSvc.getUserPlaylistFromApi();
				} else {
					this.pages = [
						{ title: 'HOME', component: HomePage, icon: 'md-home' },
						{ title: 'PROFILE', component: FallbackPage, icon: 'md-person' },
						//{ title: 'NOTIFICATIONS', component: FallbackPage, icon: "md-megaphone" },
						{ title: 'CHANNELS', component: ChannelsPage, icon: 'md-easel' },
						//{ title: 'INBOX', component: FallbackPage, icon: "md-mail" },
						{ title: 'UPLOAD_VID', component: FallbackPage, icon: 'md-videocam' },
						{ title: 'PLAYLIST_M', component: FallbackPage, icon: 'md-albums' },
						{ title: 'DOWNLOAD', component: FallbackPage, icon: 'md-download' },
						//{ title: 'CHAT', component: FallbackPage, icon: "ios-text" },
						{ title: 'SELECT_LANG', component: SelectLangPage, icon: 'md-settings' }
					];
					this.pageState = isloggedin;
				}
			})
			.catch(errCallback);
	}

	logoutAlert() {
		let alert = this.alertCtrl.create({
			title: 'Are you sure you want to Log out?',
			buttons: [
				{
					text: 'Logout',
					handler: () => {
						console.log('Logout clicked');
						this.userSvc.logout().then((r) => {
							if (r) {
								this.pushSvc.clearSubs();
								AppStateService.publishAppStateChange(this.events);
								this.nav.setRoot(HomePage);
								this.activePage = 'Home';
							} else {
								this.didLoginHadErrors = true;
							}
						});
						alert.dismiss();
						return false;
					}
				},
				{
					text: 'Cancel',
					handler: () => {
						console.log('Cancel clicked');
						alert.dismiss();
						return false;
					}
				}
			]
		});
		alert.present();
	}

	login() {
		this.nav.push(LoginPage);
	}
	checkActive(page) {
		return page == this.activePage;
	}
}
