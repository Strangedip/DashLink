export interface Collection {
  id?: string;
  name: string;
  description?: string;
  parentCollectionId?: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Link {
  id?: string;
  name: string;
  url: string;
  description?: string;
  collectionId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
} 