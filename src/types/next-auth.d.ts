import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
    };
    provider?: string;
    groups?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    provider?: string;
    groups?: string[];
  }
}
