import NextAuth from "next-auth"
import "next-auth/jwt"

import { createStorage } from "unstorage"
import memoryDriver from "unstorage/drivers/memory"
import vercelKVDriver from "unstorage/drivers/vercel-kv"
import { UnstorageAdapter } from "@auth/unstorage-adapter"
import type {  Provider } from "next-auth/providers"


const storage = createStorage({
  driver: process.env.VERCEL
    ? vercelKVDriver({
        url: process.env.AUTH_KV_REST_API_URL,
        token: process.env.AUTH_KV_REST_API_TOKEN,
        env: false,
      })
    : memoryDriver(),
})


const diditIsStaging = process.env.DIDIT_IS_STAGING === "true"

const requestedScopes = "openid names document_detail"

const diditProvider: Provider = {
  id: "didit",
  name: "Didit",
  type: "oauth",
  authorization: {
    url: diditIsStaging ? "https://auth.staging.didit.me" : "https://auth.didit.me" ,
    params: { scope: requestedScopes },
  },
  token: {
    url: diditIsStaging ? "https://apx.staging.didit.me/auth/v2/token" : "https://apx.didit.me/auth/v2/token",
  },
  userinfo: {
    url: diditIsStaging ? "https://apx.staging.didit.me/auth/v2/users/retrieve/" : "https://apx.didit.me/auth/v2/users/retrieve/",
  },
  issuer: diditIsStaging ? "https://auth.staging.didit.me/" : "https://auth.didit.me/",
  clientId: process.env.DIDIT_CLIENT_ID,
  clientSecret: process.env.DIDIT_CLIENT_SECRET,
  checks: ["state","pkce"],
  profile(profile) {
    return {
      user_data: profile,
      user_id: profile.user_id,
      name: profile.names?.full_name,
      email: profile.email?.email,
      image: profile.picture,
    };
  },
  style: {
    logo: "/didit.png",
  }
}


export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: !!process.env.AUTH_DEBUG,
  theme: { logo: "https://authjs.dev/img/logo-sm.png" },
  adapter: UnstorageAdapter(storage),
  providers: [
    diditProvider
  ],
  basePath: "/auth",
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl
      if (pathname === "/middleware-example") return !!auth
      return true
    },
    jwt({ token, trigger, session, account }) {
      if (trigger === "update") token.name = session.user.name
      if (account?.provider === "keycloak") {
        return { ...token, accessToken: account.access_token }
      }
      return token
    },
    async session({ session, token }) {
      if (token?.accessToken) session.accessToken = token.accessToken

      return session
    },
  },
  experimental: { enableWebAuthn: true },
})

declare module "next-auth" {
  interface Session {
    accessToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
  }
}
