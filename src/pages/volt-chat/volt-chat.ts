import { Component, Renderer, ViewChild, ElementRef } from '@angular/core';
import { IonicPage, NavController, NavParams, PopoverController } from 'ionic-angular';
import { VoltChatService, VoltChatEntry } from "../../app/services/volt-chat.service";
import { Subscription } from 'rxjs/Subscription';
import { ChatPopoverPage } from "../../app/popover";
import { GoogleAnalyticsService } from '../../app/services/analytics.service';

@Component({
  selector: 'page-volt-chat',
  templateUrl: 'volt-chat.html'
})
export class VoltChatPage {
  @ViewChild('content') content: any;

  private message: string = '';
  private subscription: Subscription;
  private clearSubscription: Subscription;
  private conversation: VoltChatEntry[] = [];
  private shouldScrollToBottom = false;
  private isSendingMessage = false;

  constructor(
    private chatService: VoltChatService,
    private rendered: Renderer,
    private navCtrl: NavController,
    private navParams: NavParams,
    private popoverCtrl: PopoverController,
    private gaSvc:GoogleAnalyticsService
  ) { }

  ionViewDidEnter() {
    this.chatService.getPreviousMessages().then(entries => {
      this.conversation = entries.map(en => {
        en.selected = true;
        return en;
      });
      this.shouldScrollToBottom = true;
      return this.chatService.getObservableChat();
    }).then(o => {
      this.subscription = o.subscribe(entry => {
        this.shouldScrollToBottom = true;
        this.conversation.push(entry);
      });
      return this.chatService.getObservableChatClear();
    }).then(o => {
      this.clearSubscription = o.subscribe(() => {
        this.conversation = [];
      });
    });
    this.gaSvc.gaTrackPageEnter('Volt Chat');
  }

  ionViewDidLeave() {
    this.subscription.unsubscribe();
    this.clearSubscription.unsubscribe();
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.shouldScrollToBottom = false;
      this.content.scrollToBottom(300);
    }
  }

  sendMessage() {
    if (this.message === '') {
      return;
    } else if (!this.isSendingMessage) {
      this.isSendingMessage = true;
      let newmessage = this.message;
      this.message = '';
      this.chatService.sendMessage(newmessage).then(() => {
        this.content.scrollToBottom(300);
        this.isSendingMessage = false;
      });
    }
  }

  presentPopover(myEvent) {
    let popover = this.popoverCtrl.create(ChatPopoverPage);
    popover.present({
      ev: myEvent
    });
  }
}
