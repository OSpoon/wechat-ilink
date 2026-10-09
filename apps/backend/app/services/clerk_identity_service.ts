import { randomBytes } from 'node:crypto'
import { createClerkClient } from '@clerk/backend'
import User from '#models/user'
import AccountService from '#services/account_service'

export default class ClerkIdentityService {
  async findOrCreateLocalUser(clerkUserId: string, secretKey: string) {
    const linkedUser = await User.findBy('clerkUserId', clerkUserId)
    if (linkedUser) return linkedUser

    const clerkUser = await createClerkClient({ secretKey }).users.getUser(clerkUserId)
    if (clerkUser.banned || clerkUser.locked) return null

    const primaryEmail = clerkUser.primaryEmailAddress
    if (!primaryEmail || primaryEmail.verification?.status !== 'verified') return null

    const email = primaryEmail.emailAddress.trim().toLowerCase()
    const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null
    let user = await User.findBy('email', email)

    try {
      if (user) {
        if (user.clerkUserId) return null
        user.clerkUserId = clerkUserId
        await user.save()
      } else {
        user = await User.create({
          clerkUserId,
          fullName,
          email,
          // Clerk owns credentials; create an unguessable local password solely
          // to satisfy the existing native-auth user schema.
          password: randomBytes(48).toString('base64url'),
        })
      }
    } catch (error) {
      // A second request can link or create the same identity concurrently.
      const concurrentlyLinkedUser = await User.findBy('clerkUserId', clerkUserId)
      if (concurrentlyLinkedUser) return concurrentlyLinkedUser
      throw error
    }

    await AccountService.linkInvitedDirectoryUser(user)
    return user
  }
}
