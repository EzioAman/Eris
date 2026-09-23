import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { FileIcon, FolderIcon, FolderOpenIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export type TreeViewElement = {
  id: string;
  name: string;
  type?: "file" | "folder";
  isSelectable?: boolean;
  children?: TreeViewElement[];
};

export type TreeSortMode =
  | "default"
  | "none"
  | ((a: TreeViewElement, b: TreeViewElement) => number);

type TreeContextProps = {
  selectedId: string | undefined;
  expandedItems: string[] | undefined;
  indicator: boolean;
  handleExpand: (id: string) => void;
  selectItem: (id: string) => void;
  setExpandedItems?: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
  direction: "rtl" | "ltr";
};

const TreeContext = createContext<TreeContextProps | null>(null);

export const useTree = () => {
  const context = useContext(TreeContext);
  if (!context) {
    throw new Error("useTree must be used within a TreeProvider");
  }
  return context;
};

type Direction = "rtl" | "ltr" | undefined;

const isFolderElement = (element: TreeViewElement) => {
  if (element.type) {
    return element.type === "folder";
  }
  return Array.isArray(element.children);
};

const mergeExpandedItems = (
  currentItems: string[] | undefined,
  nextItems: string[]
) => [...new Set([...(currentItems ?? []), ...nextItems])];

const treeCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

const defaultTreeComparator = (a: TreeViewElement, b: TreeViewElement) => {
  const aIsFolder = isFolderElement(a);
  const bIsFolder = isFolderElement(b);

  if (aIsFolder !== bIsFolder) {
    return aIsFolder ? -1 : 1;
  }

  return treeCollator.compare(a.name, b.name);
};

const getTreeComparator = (sort: TreeSortMode) => {
  if (sort === "none") {
    return undefined;
  }
  if (sort === "default") {
    return defaultTreeComparator;
  }
  return sort;
};

const sortTreeElements = (
  elements: TreeViewElement[],
  sort: TreeSortMode
): TreeViewElement[] => {
  const comparator = getTreeComparator(sort);

  const nextElements = elements.map((element) => {
    if (!Array.isArray(element.children)) {
      return element;
    }

    return {
      ...element,
      children: sortTreeElements(element.children, sort),
    };
  });

  if (!comparator) {
    return nextElements;
  }

  return [...nextElements].sort(comparator);
};

export const renderTreeElements = (
  elements: TreeViewElement[],
  sort: TreeSortMode
): React.ReactNode =>
  sortTreeElements(elements, sort).map((element) => {
    if (isFolderElement(element)) {
      return (
        <Folder
          key={element.id}
          value={element.id}
          element={element.name}
          isSelectable={element.isSelectable}
        >
          {Array.isArray(element.children)
            ? renderTreeElements(element.children, sort)
            : null}
        </Folder>
      );
    }

    return (
      <File
        key={element.id}
        value={element.id}
        isSelectable={element.isSelectable}
      >
        <span>{element.name}</span>
      </File>
    );
  });

export type TreeViewProps = {
  initialSelectedId?: string;
  indicator?: boolean;
  elements?: TreeViewElement[];
  initialExpandedItems?: string[];
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
  sort?: TreeSortMode;
  onSelect?: (id: string) => void;
} & Omit<
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>,
  "defaultValue" | "onValueChange" | "type" | "value"
>;

export const Tree = forwardRef<HTMLDivElement, TreeViewProps>(
  (
    {
      className,
      elements,
      initialSelectedId,
      initialExpandedItems,
      children,
      indicator = true,
      openIcon,
      closeIcon,
      sort = "default",
      dir,
      onSelect,
      ...props
    },
    ref
  ) => {
    const [selectedId, setSelectedId] = useState<string | undefined>(
      initialSelectedId
    );
    const [expandedItems, setExpandedItems] = useState<string[] | undefined>(
      initialExpandedItems
    );

    const selectItem = useCallback(
      (id: string) => {
        setSelectedId(id);
        onSelect?.(id);
      },
      [onSelect]
    );

    const handleExpand = useCallback((id: string) => {
      setExpandedItems((prev) => {
        if (prev?.includes(id)) {
          return prev.filter((item) => item !== id);
        }
        return [...(prev ?? []), id];
      });
    }, []);

    const expandSpecificTargetedElements = useCallback(
      (elems?: TreeViewElement[], selectId?: string) => {
        if (!elems || !selectId) return;
        const findParent = (
          currentElement: TreeViewElement,
          currentPath: string[] = []
        ) => {
          const isSelectable = currentElement.isSelectable ?? true;
          const newPath = [...currentPath, currentElement.id];
          if (currentElement.id === selectId) {
            if (isSelectable) {
              setExpandedItems((prev) => mergeExpandedItems(prev, newPath));
            } else {
              if (newPath.includes(currentElement.id)) {
                newPath.pop();
                setExpandedItems((prev) => mergeExpandedItems(prev, newPath));
              }
            }
            return;
          }
          if (
            Array.isArray(currentElement.children) &&
            currentElement.children.length > 0
          ) {
            currentElement.children.forEach((child) => {
              findParent(child, newPath);
            });
          }
        };
        elems.forEach((element) => {
          findParent(element);
        });
      },
      []
    );

    useEffect(() => {
      if (initialSelectedId) {
        expandSpecificTargetedElements(elements, initialSelectedId);
      }
    }, [initialSelectedId, elements, expandSpecificTargetedElements]);

    const direction = dir === "rtl" ? "rtl" : "ltr";
    const treeChildren =
      children ?? (elements ? renderTreeElements(elements, sort) : null);

    return (
      <TreeContext.Provider
        value={{
          selectedId,
          expandedItems,
          handleExpand,
          selectItem,
          setExpandedItems,
          indicator,
          openIcon,
          closeIcon,
          direction,
        }}
      >
        <div ref={ref} className={cn("size-full overflow-y-auto px-1", className)}>
          <AccordionPrimitive.Root
            {...props}
            type="multiple"
            value={expandedItems}
            className="flex flex-col gap-0.5"
            dir={dir as Direction}
          >
            {treeChildren}
          </AccordionPrimitive.Root>
        </div>
      </TreeContext.Provider>
    );
  }
);

Tree.displayName = "Tree";

export const TreeIndicator = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { direction } = useTree();

  return (
    <div
      dir={direction}
      ref={ref}
      className={cn(
        "bg-muted absolute left-1.5 h-full w-px rounded-md py-3 duration-300 ease-in-out hover:bg-slate-300 rtl:right-1.5",
        className
      )}
      {...props}
    />
  );
});

TreeIndicator.displayName = "TreeIndicator";

export type FolderProps = {
  expandedItems?: string[] | undefined;
  element: string;
  isSelectable?: boolean;
  isSelect?: boolean;
} & React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>;

export const Folder = forwardRef<
  HTMLDivElement,
  FolderProps & React.HTMLAttributes<HTMLDivElement>
>(
  (
    {
      className,
      element,
      value,
      isSelectable = true,
      isSelect,
      children,
      ...props
    },
    ref
  ) => {
    const {
      direction,
      handleExpand,
      expandedItems,
      indicator,
      selectedId,
      selectItem,
      openIcon,
      closeIcon,
    } = useTree();
    const isSelected = isSelect ?? selectedId === value;

    return (
      <AccordionPrimitive.Item
        ref={ref}
        {...props}
        value={value}
        className="relative h-full overflow-hidden"
      >
        <AccordionPrimitive.Trigger
          className={cn(
            `flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs transition-colors w-full text-left font-sans select-none`,
            className,
            {
              "bg-muted font-medium": isSelected && isSelectable,
              "cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5": isSelectable,
              "cursor-not-allowed opacity-50": !isSelectable,
            }
          )}
          disabled={!isSelectable}
          onClick={() => {
            selectItem(value);
            handleExpand(value);
          }}
        >
          {expandedItems?.includes(value)
            ? (openIcon ?? <FolderOpenIcon className="size-3.5 text-amber-500 shrink-0" />)
            : (closeIcon ?? <FolderIcon className="size-3.5 text-amber-500/80 shrink-0" />)}
          <span className="truncate">{element}</span>
        </AccordionPrimitive.Trigger>
        <AccordionPrimitive.Content className="data-[state=closed]:hidden relative h-full overflow-hidden text-xs">
          {element && indicator && <TreeIndicator aria-hidden="true" />}
          <AccordionPrimitive.Root
            dir={direction}
            type="multiple"
            className="ml-4 flex flex-col gap-0.5 py-0.5 border-l border-slate-200 dark:border-white/10 pl-2"
            value={expandedItems}
          >
            {children}
          </AccordionPrimitive.Root>
        </AccordionPrimitive.Content>
      </AccordionPrimitive.Item>
    );
  }
);

Folder.displayName = "Folder";

export const File = forwardRef<
  HTMLButtonElement,
  {
    value: string;
    handleSelect?: (id: string) => void;
    isSelectable?: boolean;
    isSelect?: boolean;
    fileIcon?: React.ReactNode;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(
  (
    {
      value,
      className,
      handleSelect,
      onClick,
      isSelectable = true,
      isSelect,
      fileIcon,
      children,
      ...props
    },
    ref
  ) => {
    const { direction, selectedId, selectItem } = useTree();
    const isSelected = isSelect ?? selectedId === value;
    return (
      <button
        ref={ref}
        type="button"
        disabled={!isSelectable}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-xs duration-150 ease-in-out font-sans select-none text-left",
          {
            "bg-blue-50 text-blue-600 dark:bg-white/10 dark:text-amber-300 font-semibold": isSelected && isSelectable,
          },
          isSelectable ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5" : "cursor-not-allowed opacity-50",
          direction === "rtl" ? "rtl" : "ltr",
          className
        )}
        onClick={(event) => {
          selectItem(value);
          handleSelect?.(value);
          onClick?.(event);
        }}
        {...props}
      >
        {fileIcon ?? <FileIcon className="size-3.5 text-slate-400 dark:text-neutral-400 shrink-0" />}
        <span className="truncate">{children}</span>
      </button>
    );
  }
);

File.displayName = "File";

export default Tree;
