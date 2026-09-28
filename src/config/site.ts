import { defaultTheme } from "../modules/UIModule/config/theme";
export const site = {
  name: "Etymolog",
  operatorName: "Süchceren Cecegé",
  email: "info@prasentace.cz",
  phone: "+420 722 767 646",
  registrationId: "04473442",
  address: {
    street: "Eleonory Voračické 2167/29",
    city: "Brno – Žabovřesky",
    postalCode: "616 00",
    country: "CZ",
  },
  theme: defaultTheme,
  modules: { auth: true, ads: true, realtime: true },
} as const;
