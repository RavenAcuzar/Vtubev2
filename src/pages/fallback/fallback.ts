import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { LoginPage } from "../login/login";

/**
 * Generated class for the FallbackPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */


@Component({
  selector: 'page-fallback',
  templateUrl: 'fallback.html',
})
export class FallbackPage {

  constructor(public navCtrl: NavController, public navParams: NavParams) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad FallbackPage');
  }
  goToLogin(){
    this.navCtrl.push(LoginPage);
  }
}
