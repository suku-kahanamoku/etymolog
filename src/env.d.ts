/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    requestId: string;
    privatePage?: boolean;
    providers: import("./server/providers").Providers;
    getUser: () => Promise<import("./modules/AuthModule/types").User | null>;
  }
}
