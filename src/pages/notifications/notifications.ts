import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { PushNotificationService } from '../../app/services/pushnotif.service';

import { NowPlayingPage } from '../now-playing/now-playing';

/**
 * Generated class for the NotificationsPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */


@Component({
  selector: 'page-notifications',
  templateUrl: 'notifications.html',
})
export class NotificationsPage {

  notifications=[];
  constructor(public navCtrl: NavController, public navParams: NavParams,
    private pushNotif:PushNotificationService) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad NotificationsPage');
    this.pushNotif.getAllNotif().then(notifs=>{
      this.notifications = notifs;
    })
  }
  ionViewWillLeave(){
    this.pushNotif.setAllNotifAsRead();
  }
  goToNotification(data, id){
    this.pushNotif.setAllNotifAsRead(id).then(r=>{
      console.log(document.getElementById(id));
      document.getElementById(id).classList.add("wasRead");
    });
    if(data){
      this.navCtrl.push(NowPlayingPage,{
        'id':data
      });
    }
  }
  deleteNotif(id,index){
    this.pushNotif.deleteNotif(id)
    .then(()=>this.notifications.splice(index,1));
  }
}
