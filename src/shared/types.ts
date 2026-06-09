export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  folderPath: string[];
  folderIdPath: string[];
  dateAdded: number;
}

export interface FolderNode {
  id: string;
  title: string;
  children: FolderNode[];
  bookmarkCount: number;
}

export type ViewMode = 'folder' | 'frequent' | 'recent' | 'report';
