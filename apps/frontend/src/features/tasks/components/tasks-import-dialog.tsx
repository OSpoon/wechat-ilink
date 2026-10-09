import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { tasksApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const formSchema = z.object({
  file: z
    .instanceof(FileList)
    .refine((files) => files.length > 0, {
      message: 'Please upload a file.',
    })
    .refine(
      (files) => ['text/csv'].includes(files?.[0]?.type),
      'Please upload csv format.'
    ),
})

type TaskImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function parseCsv(source: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      row.push(cell.trim())
      cell = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += character
    }
  }

  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

export function TasksImportDialog({
  open,
  onOpenChange,
}: TaskImportDialogProps) {
  const queryClient = useQueryClient()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { file: undefined },
  })

  const fileRef = form.register('file')
  const mutation = useMutation({
    mutationFn: tasksApi.bulkCreate,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success(
        `Imported ${created.length} task${created.length === 1 ? '' : 's'}.`
      )
      onOpenChange(false)
      form.reset()
    },
  })

  const onSubmit = async () => {
    const file = form.getValues('file')
    if (file && file[0]) {
      const [header = [], ...rows] = parseCsv(await file[0].text())
      const normalizedHeader = header.map((value) => value.toLowerCase())
      const requiredFields = ['title', 'status', 'label', 'priority']
      if (requiredFields.some((field) => !normalizedHeader.includes(field))) {
        toast.error(
          'CSV must include title, status, label, and priority columns.'
        )
        return
      }

      const tasks = rows.map((row) =>
        Object.fromEntries(
          requiredFields.map((field) => [
            field,
            row[normalizedHeader.indexOf(field)] ?? '',
          ])
        )
      ) as { title: string; status: string; label: string; priority: string }[]
      if (!tasks.length) {
        toast.error('The CSV file does not contain any task rows.')
        return
      }
      mutation.mutate(tasks)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val)
        form.reset()
      }}
    >
      <DialogContent className='gap-2 sm:max-w-sm'>
        <DialogHeader className='text-start'>
          <DialogTitle>Import Tasks</DialogTitle>
          <DialogDescription>
            Import tasks quickly from a CSV file.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id='task-import-form' onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name='file'
              render={() => (
                <FormItem className='my-2'>
                  <FormLabel>File</FormLabel>
                  <FormControl>
                    <Input
                      type='file'
                      accept='text/csv'
                      {...fileRef}
                      className='h-8 py-0'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter className='gap-2'>
          <DialogClose asChild>
            <Button variant='outline'>Close</Button>
          </DialogClose>
          <Button
            type='submit'
            form='task-import-form'
            disabled={mutation.isPending}
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
