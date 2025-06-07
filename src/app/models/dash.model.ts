export interface Dash{
    collections:Collection[],
    links:[]
  }
  
  export interface Collection {
    id?: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    children:any[];
  }
  
  export interface Node {
    id?: string;
    name: string;
    description?: string;
    link?: string;
    collectionId: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  } 