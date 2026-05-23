import { ProfileExperience } from '../ProfileExperience'
import travelerProfile from '../../data/demoProfile.json'

export default function DemoPage() {
  return <ProfileExperience seedProfile={travelerProfile} />
}
