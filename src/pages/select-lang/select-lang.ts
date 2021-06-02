import { Component } from '@angular/core';
import { NavController, NavParams, Platform} from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { Storage } from '@ionic/storage';
import { APP_LANG } from '../../app/app.constants';
import { HomePage } from '../home/home';

/**
 * Generated class for the SelectLangPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */

@Component({
  selector: 'page-select-lang',
  templateUrl: 'select-lang.html',
})
export class SelectLangPage {

  constructor(public navCtrl: NavController, 
    public navParams: NavParams,
    private translateSvc:TranslateService,
    private storage:Storage,
    private platform:Platform
    ) {
  }
  segmentChanged(event) {
    if(event == "ar"){
      this.platform.setDir('rtl', true);
      //this.platform.setDir('ltr', false); 
    }
    else
    {
      this.platform.setDir('ltr', true);
      //this.platform.setDir('rtl', false);
    }
    this.translateSvc.use(event);
    this.storage.set(APP_LANG, event);
    this.navCtrl.setRoot(HomePage);
  }
  ionViewDidLoad() {
    console.log('ionViewDidLoad SelectLangPage');
  }

}
