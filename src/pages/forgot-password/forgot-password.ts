import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { GoogleAnalyticsService } from '../../app/services/analytics.service';
import { UserService } from '../../app/services/user.service';

/**
 * Generated class for the ForgotPasswordPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */

@Component({
  selector: 'page-forgot-password',
  templateUrl: 'forgot-password.html',
})
export class ForgotPasswordPage {
  private inputEmail: string;
  private message;
  private hideMessage = true;
  constructor(public navCtrl: NavController,
    public navParams: NavParams,
    private gaSvc:GoogleAnalyticsService,
    private userSvc:UserService) {
      this.gaSvc.gaTrackPageEnter('Forgot Password');
  }
  sendResetEmail() {
    this.userSvc.forgotPassword(this.inputEmail)
    .then(r=>{
      this.hideMessage = false;
      if(r){
        this.message = "Forgot Password Sent to your Email: " + this.inputEmail;
      }
      else{
        this.message = "Error! Email Not found. You may contact vbox@the-v.net."
      }
    })
    .catch(e=>{
      this.message = e.message;
    })
    
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ForgotPasswordPage');
  }

}
