import {
  Action,
  getModule,
  Module,
  Mutation,
  VuexModule
} from "vuex-module-decorators";
import store from "@/store";
import { ChatClient } from "../../../proto/chat_grpc_web_pb";
import {
  Message,
  MessageRequest,
  SubscriptionRequest,
  UnsubscriptionRequest
} from "../../../proto/chat_pb";
import * as grpcWeb from "grpc-web";

@Module({
  namespaced: true,
  name: "chat",
  store,
  dynamic: true
})
class ChatModule extends VuexModule {
  chatClient!: ChatClient;

  subscribed: boolean = false;
  username: string = "";
  messages: string = "";

  get getUsername(): string {
    return this.username;
  }

  get getMessages(): string {
    return this.messages;
  }

  get isSubscribed(): boolean {
    return this.subscribed;
  }

  @Mutation
  setUsername(username: string) {
    this.username = username;
  }

  @Mutation
  setSubscription(subscription: boolean) {
    this.subscribed = subscription;
  }

  @Mutation
  appendMessage(data: Message) {
    if (data) {
      this.messages +=
        "[" +
        new Date(data.getTimestamp()).toISOString() +
        "] " +
        data.getUsername() +
        ": " +
        data.getMessage() +
        "\n";
    } else {
      this.messages += "ERROR: Message not delivered" + "\n";
    }
  }

  @Action
  connectClient(host: string) {
    this.chatClient = new ChatClient(host, null, null);
    console.log("Client connected.");
  }

  @Action
  async subscribe() {
    console.log("User has subscribed: " + this.username);

    const subscriptionRequest = new SubscriptionRequest();
    subscriptionRequest.setUsername(this.username);

    this.chatClient.subscribe(subscriptionRequest).on("data", data => {
      if (!data.getMessage().includes("Error")) {
        this.setSubscription(true);
      }
      this.appendMessage(data);
    });
  }

  @Action
  unsubscribe() {
    console.log("User has unsubscribed: " + this.username);

    const unsubscriptionRequest = new UnsubscriptionRequest();
    unsubscriptionRequest.setUsername(this.username);

    this.chatClient.unsubscribe(
      unsubscriptionRequest,
      {},
      (err: grpcWeb.Error, message: Message) => {
        this.setSubscription(false);
      }
    );
  }

  @Action
  sendMessage(message: string) {
    const messageRequest = new MessageRequest();

    messageRequest.setUsername(this.username);
    messageRequest.setMessage(message);

    this.chatClient.sendMessage(
      messageRequest,
      {},
      (err: grpcWeb.Error, message: Message) => {
        if (message) {
          // Log errors or messages here.
          console.log("Message received: " + message.getMessage());
        } else {
          console.error("An error has occurred.");
        }
      }
    );
  }
}

export default getModule(ChatModule);
