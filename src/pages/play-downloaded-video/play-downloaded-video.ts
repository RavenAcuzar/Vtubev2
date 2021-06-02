import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { DownloadService } from "../../app/services/download.service";
import { GoogleAnalyticsService } from '../../app/services/analytics.service';

@Component({
  selector: 'page-play-downloaded-video',
  templateUrl: 'play-downloaded-video.html',
})
export class PlayDownloadedVideoPage {

  private vidId;
  private vidSource = '';
  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    private downloadSrvc: DownloadService,
    private gaSvc:GoogleAnalyticsService
  ) { 
    this.vidId= navParams.get('id');
    this.vidSource = this.downloadSrvc.getPathOfVideo(this.vidId);
    this.gaSvc.gaTrackPageEnter('Downloaded Video');
  }

  ionViewDidLoad() {
    
  }
}
