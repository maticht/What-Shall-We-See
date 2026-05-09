declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            locale?: string;
            callback: (response: { credential?: string }) => void | Promise<void>;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_black";
              size?: "large";
              shape?: "pill";
              text?: "signin_with";
              locale?: string;
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

export {};
