import { photoPOST as localPOST } from '@beenthere/storage-local'
import { photoPOST as githubPOST } from '@beenthere/storage-github'

const local = process.env.STORAGE_BACKEND === 'local'
export const POST = local ? localPOST : githubPOST
