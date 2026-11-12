import type { Bank } from "@/lib/banks/queries";

export const BANKS: Bank[] = [
  {
    bin: "970415",
    code: "ICB",
    shortName: "VietinBank",
    name: "Ngân hàng TMCP Công thương Việt Nam",
    logo: "https://cdn.example/ICB.png",
  },
  {
    bin: "970436",
    code: "VCB",
    shortName: "Vietcombank",
    name: "Ngân hàng TMCP Ngoại Thương Việt Nam",
    logo: "https://cdn.example/VCB.png",
  },
  {
    bin: "970422",
    code: "MB",
    shortName: "MBBank",
    name: "Ngân hàng TMCP Quân đội",
    logo: "",
  },
];
