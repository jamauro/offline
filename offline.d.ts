declare module 'meteor/mongo' {
  module Mongo {
    interface Collection<T> {
      /**
       * Keeps a filter, sort, and limit configuration for the MongoDB collection.
       *
       * @param filter - The optional filter object to keep.
       * @param options - Optional settings.
       * @param options.sort - The sort order. Defaults to Offline.config.sort.
       * @param options.limit - The limit of documents. Defaults to Offline.config.limit.
       */
      keep(
        filter?: Record<string, any>,
        options?: {
          sort?: Record<string, any>,
          limit?: number
        }
      ): void;

      /**
       * Clears all documents from the MongoDB collection (client-side).
       * Can be used isomorphically, but on the server, it's a no-op.
       *
       * @returns A promise that resolves when the collection is cleared.
       */
      clear(): Promise<void>;
    }
  }
}

/**
 * Clears all stores in the IndexedDB database.
 *
 * @returns A promise that resolves when all stores are cleared.
 */
export async function clearAll(): Promise<void>;

/**
 * Queues a method with its arguments to be executed later.
 *
 * @param name - The name of the method to queue.
 * @param args - Arguments to pass to the method.
 * @returns A promise that resolves when the method is queued.
 */
export async function queueMethod(name: string, ...args: any[]): Promise<void>;


/**
 * Returns the current syncing status.
 *
 * @returns The current syncing status.
 */
export declare function isSyncing(): boolean;


/**
 * Configuration options for offline data management.
 */
export declare const Offline: {
  /**
   * The current offline configuration.
   */
  config: {
    filter?: Record<string, any>;    // Criteria to filter data
    sort?: Record<string, any>;      // Criteria to sort data
    limit?: number;                  // Maximum number of items
    keepAll?: boolean;               // Whether to keep all items
    autoSync?: boolean;              // Whether to sync automatically
    handleSyncErrors?: (options: {  // Function to handle sync errors
      replayErrors?: any[];
      keepErrors?: { name: string }[];
    }) => void;
  };

  /**
   * Function to configure offline data management.
   *
   * @param options - Configuration settings.
   * @returns The updated configuration.
   */
  configure: (options: Partial<{
    filter?: Record<string, any>;
    sort?: Record<string, any>;
    limit?: number;
    keepAll?: boolean;
    autoSync?: boolean;
    handleSyncErrors?: (options: {
      replayErrors?: any[];
      keepErrors?: { name: string }[];
    }) => void;
  }>) => {
    filter?: Record<string, any>;
    sort?: Record<string, any>;
    limit?: number;
    keepAll?: boolean;
    autoSync?: boolean;
    handleSyncErrors?: (options: {
      replayErrors?: any[];
      keepErrors?: { name: string }[];
    }) => void;
  };
};
