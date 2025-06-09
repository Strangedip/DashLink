export interface Collection {
  id?: string;
  name: string;
  description?: string;
  parentCollectionId?: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomField {
  fieldName: string;
  fieldValue: any;
  fieldType: string;
}

export interface Node {
  id?: string;
  name: string;
  description?: string | null;
  collectionId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  customFields?: CustomField[];
} 