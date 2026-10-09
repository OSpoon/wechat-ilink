import DirectoryUser from '#models/directory_user'
import type User from '#models/user'

export default class AccountService {
  static async linkInvitedDirectoryUser(user: User) {
    const invitation = await DirectoryUser.findBy('email', user.email)
    if (invitation?.status !== 'invited' || invitation.authUserId) return

    invitation.authUserId = user.id
    invitation.status = 'active'

    if (user.fullName) {
      const [firstName, ...lastName] = user.fullName.trim().split(/\s+/)
      invitation.firstName = firstName || invitation.firstName
      invitation.lastName = lastName.join(' ') || invitation.lastName
    }

    await invitation.save()
  }
}
