import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Notification } from '../../app/models/notification.models';
import { NowPlayingPage } from '../now-playing/now-playing';

/**
 * Generated class for the NotifModalPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */


@Component({
  selector: 'page-notif-modal',
  templateUrl: 'notif-modal.html',
})
export class NotifModalPage {
  private notifiaction:Notification;
  constructor(public navCtrl: NavController, public navParams: NavParams) {
    this.notifiaction = this.navParams.get('data');
  }

  goToPage(data){
    if(data){
      this.navCtrl.push(NowPlayingPage, {
        'id':data
      })
    }
  }
  ionViewDidLoad() {
    console.log('ionViewDidLoad NotifModalPage');
  }

}
