import { profileGET as localGET, profilePUT as localPUT } from '@beenthere/storage-local'
import { profileGET as githubGET, profilePUT as githubPUT } from '@beenthere/storage-github'

const local = process.env.STORAGE_BACKEND !== 'github'
export const GET = local ? localGET : githubGET
export const PUT = local ? localPUT : githubPUT

