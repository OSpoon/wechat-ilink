import { AxiosError } from 'axios'
import { toast } from 'sonner'

export function handleServerError(error: unknown) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(error)
  }

  let errMsg = 'Something went wrong!'

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = 'No content.'
  }

  if (error instanceof AxiosError) {
    const responseData: unknown = error.response?.data
    if (responseData && typeof responseData === 'object') {
      const body = responseData as {
        title?: unknown
        message?: unknown
        errors?: Array<{ message?: unknown }>
      }
      const validationMessage = body.errors?.find(
        (item) => typeof item.message === 'string'
      )?.message
      const message = body.title ?? validationMessage ?? body.message
      if (typeof message === 'string' && message.length > 0) {
        errMsg = message
      }
    }
  }

  toast.error(errMsg)
}
