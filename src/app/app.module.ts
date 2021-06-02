import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { HttpClient, HttpClientModule} from '@angular/common/http';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import { ChannelsPage } from "../pages/channels/channels";
import { ChannelPrevPage } from "../pages/channel-prev/channel-prev";
import { DownloadsPage } from "../pages/downloads/downloads";
import { LoginPage } from "../pages/login/login";
import { NowPlayingPage } from "../pages/now-playing/now-playing";
import { PlaylistPage } from "../pages/playlist/playlist";
import { ProfilePage } from "../pages/profile/profile";
import { SearchPage } from "../pages/search/search";
import { FallbackPage } from "../pages/fallback/fallback";
import { ForgotPasswordPage } from "../pages/forgot-password/forgot-password";

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { HomePopoverPage, PlaylistPopoverPage, ChatPopoverPage, InboxPopoverPage } from "./popover";
import { ScreenOrientation } from "@ionic-native/screen-orientation";
import { IonicStorageModule } from "@ionic/storage";
import { FormsModule } from "@angular/forms";
import { SQLite } from "@ionic-native/sqlite";
import { FileTransfer } from '@ionic-native/file-transfer';
import { DownloadService } from "./services/download.service";
import { PlaylistService } from "./services/playlist.service";
import { VideoService } from "./services/video.service";
import { File } from '@ionic-native/file';
import { UserService } from "./services/user.service";
import { ChannelService } from "./services/channel.service";
import { PlayDownloadedVideoPage } from "../pages/play-downloaded-video/play-downloaded-video";
import { AndroidPermissions } from "@ionic-native/android-permissions";
import { ConnectionService } from "./services/network.service";
import { Network } from "@ionic-native/network";
import { VoltChatPage } from "../pages/volt-chat/volt-chat";
import { VoltChatService } from "./services/volt-chat.service";
import { UploadVideoPage } from "../pages/upload-video/upload-video";
import { Camera } from "@ionic-native/camera";
import { MediaCapture } from "@ionic-native/media-capture";
import { UploadService } from "./services/upload.service";
import { ProgressBarComponent } from '../components/progress-bar/progress-bar';
import { Deeplinks } from "@ionic-native/deeplinks";
//import { Push } from '@ionic-native/push';
import { InboxPage } from '../pages/inbox/inbox';
import { GoogleAnalyticsService } from './services/analytics.service';
import { GoogleAnalytics } from '@ionic-native/google-analytics';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { SelectLangPage } from '../pages/select-lang/select-lang';
import { PushNotificationService } from './services/pushnotif.service';
import { TooltipsModule } from 'ionic-tooltips';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NotificationsPage } from '../pages/notifications/notifications';
// import { NotificationService } from './services/notifications.service';
import { NotifModalPage } from '../pages/notif-modal/notif-modal';
import { HTTP } from '@ionic-native/http';
//import { HTTP } from '@ionic-native/http';
import { LocalNotifications } from '@ionic-native/local-notifications';


export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http,'./assets/i18n/','.json');
}

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    ChannelsPage,
    ChannelPrevPage,
    UploadVideoPage,
    DownloadsPage,
    LoginPage,
    NowPlayingPage,
    PlaylistPage,
    ProfilePage,
    SearchPage,
    FallbackPage,
    ForgotPasswordPage,
    HomePopoverPage,
    InboxPopoverPage,
    PlayDownloadedVideoPage,
    PlaylistPopoverPage,
    ChatPopoverPage,
    VoltChatPage,
    InboxPage,
    SelectLangPage,
    ProgressBarComponent,
    NotificationsPage,
    NotifModalPage
  ],
  imports: [
    BrowserModule,
    TooltipsModule.forRoot(),
    BrowserAnimationsModule,
    IonicModule.forRoot(MyApp),
    IonicStorageModule.forRoot(),
    HttpClientModule,
    //HTTP,
    FormsModule,
    TranslateModule.forRoot({
      loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
      }
  })
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    ChannelsPage,
    ChannelPrevPage,
    UploadVideoPage,
    DownloadsPage,
    LoginPage,
    NowPlayingPage,
    PlaylistPage,
    ProfilePage,
    SearchPage,
    FallbackPage,
    ForgotPasswordPage,
    HomePopoverPage,
    InboxPopoverPage,
    PlayDownloadedVideoPage,
    PlaylistPopoverPage,
    ChatPopoverPage,
    VoltChatPage,
    SelectLangPage,
    InboxPage,
    NotificationsPage,
    NotifModalPage
  ],
  providers: [
    File,
    FileTransfer,
    SQLite,
    StatusBar,
    HTTP,
    SplashScreen,
    ScreenOrientation,
    UserService,
    VideoService,
    PlaylistService,
    DownloadService,
    ChannelService,
    UploadService,
    AndroidPermissions,
    ConnectionService,
    VoltChatService,
    GoogleAnalyticsService,
    Camera,
    Network,
    MediaCapture,
    Deeplinks,
    GoogleAnalytics,
    PushNotificationService,
    // NotificationService,
    LocalNotifications,
    {provide: ErrorHandler, useClass: IonicErrorHandler}
  ]
})
export class AppModule {}
