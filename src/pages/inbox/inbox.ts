import { Component } from '@angular/core';
import { NavController, NavParams, PopoverController, LoadingController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { Network } from '@ionic-native/network';
import { USER_DATA_KEY, MAILS_DATA } from '../../app/app.constants';
import { InboxPopoverPage } from '../../app/popover';
import { GoogleAnalyticsService } from '../../app/services/analytics.service';

/**
 * Generated class for the InboxPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */


@Component({
  selector: 'page-inbox',
  templateUrl: 'inbox.html',
})
export class InboxPage {
  private options;
  private emails = [];
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    
    private storage: Storage,
    private network: Network,
    private popoverCtrl: PopoverController,
    public loadingCtrl: LoadingController,
    private gaSvc:GoogleAnalyticsService) {
    this.gaSvc.gaTrackPageEnter('Inbox');
    // this.options = new RequestOptions({
    //   headers: new Headers({
    //     'Content-Type': 'application/x-www-form-urlencoded'
    //   })
    // });
    // if (this.checkConnection)
    //   this.loadMail();
    // else
    //   this.loadMailFromStorage();
  }
  checkConnection() {
    // if (this.network.type === 'none')
    //   return false;
    // else
    //   return true;
  }
  ionViewDidLeave() {
    // this.storage.set(MAILS_DATA, this.emails);
  }
  loadMailFromStorage() {
    // this.storage.get(MAILS_DATA).then(emails => {
    //   this.emails = emails;
    // });
  }
  loadMail() {
    // let req;
    // let loading = this.loadingCtrl.create({ enableBackdropDismiss: true });
    // loading.onDidDismiss(() => {
    //   req.unsubscribe();
    // });
    // this.storage.get(USER_DATA_KEY)
    //   .then(user => {
    //     loading.present().then(() => {
    //       let body = new URLSearchParams();
    //       body.set('action', 'DDrupal_User_inbox');
    //       body.set('userID', user.id);
    //       req = this.http.post('https://cums.the-v.net/site.aspx', body, this.options)
    //         .subscribe(emails => {
    //           this.emails = emails.json();
    //           loading.dismiss();
    //         })
    //     })
    //   })
  }
  showEmailContent(email) {
    // let popover = this.popoverCtrl.create(InboxPopoverPage, {
    //   content: email
    // }, { cssClass: 'email-content' })
    // popover.present();
  }


}
