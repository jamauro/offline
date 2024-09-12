declare module 'meteor/mongo' {
  module Mongo {
    interface Collection<T> {
      /**
       * Keeps a filter, sort, and limit configuration for the MongoDB collection.
       *
       * @param filter - The optional filter object to keep. Defaults to Offline.config.filter.
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
    filter?: Record<string, any>;    // Filter criteria for data
    sort?: Record<string, any>;      // Sorting options. Default is sorting by `updatedAt` in descending order
    limit?: number;                  // Maximum number of items to keep. Default is 100
    keepAll?: boolean;               // Keep all collections for offline use. Default is `true`
    autoSync?: boolean;              // Automatically sync data when coming back online. Default is `true`
    handleSyncErrors?: (options: {   // Function to handle sync errors
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
