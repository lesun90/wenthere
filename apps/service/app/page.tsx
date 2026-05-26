import { CloudProfileExperience } from './CloudProfileExperience'
import type { TravelerProfile } from '@beenthere/ui'

const seedProfile: TravelerProfile = {
  id: 'cloud-demo-user',
  name: 'Beenthere',
  photos: [],
  presentation: {
    countryHeroes: {},
    subdivisionHeroes: {},
  },
}

export default function ServicePage() {
  return <CloudProfileExperience seedProfile={seedProfile} />
}
