import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { type Table } from '@tanstack/react-table'
import { Trash2, CircleArrowUp, ArrowUpDown, Download } from 'lucide-react'
import { toast } from 'sonner'
import { tasksApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { priorities, statuses } from '../data/data'
import { type Task } from '../data/schema'
import { TasksMultiDeleteDialog } from './tasks-multi-delete-dialog'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const queryClient = useQueryClient()
  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleBulkStatusChange = (status: string) => {
    const selectedTasks = selectedRows.map((row) => row.original as Task)
    const promise = tasksApi
      .bulkUpdate(
        selectedTasks.map((task) => task.id),
        { status }
      )
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: ['tasks'] })
        table.resetRowSelection()
      })
    toast.promise(promise, {
      loading: 'Updating status...',
      success: `Status updated to "${status}" for ${selectedTasks.length} task${selectedTasks.length > 1 ? 's' : ''}.`,
      error: 'Error',
    })
  }

  const handleBulkPriorityChange = (priority: string) => {
    const selectedTasks = selectedRows.map((row) => row.original as Task)
    const promise = tasksApi
      .bulkUpdate(
        selectedTasks.map((task) => task.id),
        { priority }
      )
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: ['tasks'] })
        table.resetRowSelection()
      })
    toast.promise(promise, {
      loading: 'Updating priority...',
      success: `Priority updated to "${priority}" for ${selectedTasks.length} task${selectedTasks.length > 1 ? 's' : ''}.`,
      error: 'Error',
    })
  }

  const handleBulkExport = () => {
    const selectedTasks = selectedRows.map((row) => row.original as Task)
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`
    const lines = [
      ['id', 'title', 'status', 'label', 'priority'],
      ...selectedTasks.map((task) => [
        task.id,
        task.title,
        task.status,
        task.label,
        task.priority,
      ]),
    ]
    const file = new Blob(
      [lines.map((line) => line.map(escapeCsv).join(',')).join('\r\n')],
      { type: 'text/csv;charset=utf-8' }
    )
    const url = URL.createObjectURL(file)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'tasks.csv'
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success(
      `Exported ${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'} to CSV.`
    )
    table.resetRowSelection()
  }

  return (
    <>
      <BulkActionsToolbar table={table} entityName='task'>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-8'
                  aria-label='Update status'
                  title='Update status'
                >
                  <CircleArrowUp />
                  <span className='sr-only'>Update status</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Update status</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent sideOffset={14}>
            {statuses.map((status) => (
              <DropdownMenuItem
                key={status.value}
                defaultValue={status.value}
                onClick={() => handleBulkStatusChange(status.value)}
              >
                {status.icon && (
                  <status.icon className='size-4 text-muted-foreground' />
                )}
                {status.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-8'
                  aria-label='Update priority'
                  title='Update priority'
                >
                  <ArrowUpDown />
                  <span className='sr-only'>Update priority</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Update priority</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent sideOffset={14}>
            {priorities.map((priority) => (
              <DropdownMenuItem
                key={priority.value}
                defaultValue={priority.value}
                onClick={() => handleBulkPriorityChange(priority.value)}
              >
                {priority.icon && (
                  <priority.icon className='size-4 text-muted-foreground' />
                )}
                {priority.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkExport()}
              className='size-8'
              aria-label='Export tasks'
              title='Export tasks'
            >
              <Download />
              <span className='sr-only'>Export tasks</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export tasks</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => setShowDeleteConfirm(true)}
              className='size-8'
              aria-label='Delete selected tasks'
              title='Delete selected tasks'
            >
              <Trash2 />
              <span className='sr-only'>Delete selected tasks</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete selected tasks</p>
          </TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <TasksMultiDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        table={table}
      />
    </>
  )
}
