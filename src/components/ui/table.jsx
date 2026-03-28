import { cn } from '@/lib/utils'

const Table = ({ className, ...props }) => (
  <div className="relative w-full overflow-auto" data-theme-table>
    <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
  </div>
)

const TableHeader = ({ className, ...props }) => (
  <thead className={cn('[&_tr]:border-b', className)} {...props} />
)

const TableBody = ({ className, ...props }) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
)

const TableRow = ({ className, ...props }) => (
  <tr
    className={cn(
      'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
      className,
    )}
    {...props}
  />
)

const TableHead = ({ className, ...props }) => (
  <th
    className={cn(
      'h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
      className,
    )}
    {...props}
  />
)

const TableCell = ({ className, ...props }) => (
  <td
    className={cn(
      'p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
      className,
    )}
    {...props}
  />
)

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell }
