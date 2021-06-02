import { Component } from '@angular/core';
import { NavController, NavParams, AlertController } from 'ionic-angular';
import { USER_DATA_KEY } from '../../app/app.constants';
import { Storage } from '@ionic/storage';
import { formatDate } from '../../app/app.utils';
import { GoogleAnalyticsService } from '../../app/services/analytics.service';

@Component({
	selector: 'page-profile',
	templateUrl: 'profile.html'
})
export class ProfilePage {
	userDetails: any = {};
	days_left = '';
	//url = 'http://site.the-v.net/';

	constructor(
		public navCtrl: NavController,
		public navParams: NavParams,
		private storage: Storage,
		private alertCtrl: AlertController,
		private gaSvc: GoogleAnalyticsService
	) {}

	ionViewDidEnter() {
		this.getProfileDetails();
		this.gaSvc.gaTrackPageEnter('Profile');
	}

	getProfileDetails() {
		this.storage.get(USER_DATA_KEY).then((userDetails) => {
			if (userDetails) {
				this.userDetails = userDetails;

				this.userDetails.finalAvatarUrl = 'https://api.the-v.net/site/v2.0/picture?id=' + this.userDetails.id;
				this.userDetails.fullname = this.userDetails.username;
				this.userDetails.userBday = formatDate(new Date(this.userDetails.birthday));
			} else {
				let alert = this.alertCtrl.create({
					title: 'Error!',
					message: 'Profile not found!',
					buttons: [
						{
							text: 'Ok',
							handler: () => {
								console.log('Cancel clicked');
								alert.dismiss();
								return false;
							}
						}
					]
				});
			}
			//console.log(userDetails);
			this.days_left = Math.floor(
				(Date.parse(userDetails.membershipExpiry) - Date.now()) / 1000 / 60 / (60 * 24)
			).toString();
		});
	}
}
