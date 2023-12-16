export type TemplateData = {
  id: string;
  name: string;
  description: string;
  repo: string;
  layout: {
    rows: number;
    cols: number;
  };
};

export type Manifest = {
  version: 11;
  project: Project;
  scene: Scene;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  sceneId: string;
  ethAddress: null;
  layout: {
    rows: number;
    cols: number;
  };
  createdAt: string;
  updatedAt: string;
  isTemplate: true;
  isPublic: boolean;
  video: string;
  templateStatus: "active" | "coming_soon" | null;
};

export type Scene = {
  sdk6: null;
  sdk7: {
    id: string;
    composite: {
      version: number;
      components: any[];
    };
    mappings: Record<string, string>;
  };
};
