import { photoKeyGET as localGET, photoKeyDELETE as localDELETE } from '@beenthere/storage-local'
import { photoKeyGET as githubGET, photoKeyDELETE as githubDELETE } from '@beenthere/storage-github'

const local = process.env.STORAGE_BACKEND === 'local'
export const GET = local ? localGET : githubGET
export const DELETE = local ? localDELETE : githubDELETE
