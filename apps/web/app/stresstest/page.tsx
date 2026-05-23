import { ProfileExperience } from '../ProfileExperience'
import roamerProfile from '../../data/roamerProfile.json'

export default function StressTestPage() {
  return <ProfileExperience seedProfile={roamerProfile} />
}
