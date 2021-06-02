import { Component } from '@angular/core';
import { NavController, Events } from 'ionic-angular';
import { ForgotPasswordPage } from '../forgot-password/forgot-password';
import { HomePage } from '../home/home';
import { AppStateService } from '../../app/services/app_state.service';
import { GoogleAnalyticsService } from '../../app/services/analytics.service';
import { UserService } from '../../app/services/user.service';

@Component({
	selector: 'page-login',
	templateUrl: 'login.html'
})
export class LoginPage {
	private isCredentialsIncorrect = false;
	private didLoginHadErrors = false;
	private freeUserError = false;
	private apiUrl = 'https://api.the-v.net/User';

	private loginForm: {
		email: string;
		password: string;
	} = {
		email: '',
		password: ''
	};

	constructor(
		private navCtrl: NavController,
		private event: Events,
		private gaSvc: GoogleAnalyticsService,
		private userSvc:UserService
	) {
		this.gaSvc.gaTrackPageEnter('Login');
	}

	login() {
		this.isCredentialsIncorrect = false;
		this.didLoginHadErrors = false;
		this.userSvc.login(this.loginForm)
		.then(r=>{
			if(r){
				AppStateService.publishAppStateChange(this.event);
				this.navCtrl.setRoot(HomePage);
			}
			else {
				this.didLoginHadErrors = true;
			}
		})
		.catch((e)=>{
			console.log(e);
			if(e.message === 'UNAUTHORIZED')
				this.isCredentialsIncorrect = true;
			else if(e.message === 'FREEUSER')
				this.freeUserError = true;
			else
				this.didLoginHadErrors = true;
		})
	}

	forgotPass() {
		this.navCtrl.push(ForgotPasswordPage);
	}
}
