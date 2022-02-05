import axios from "axios";

interface FeatureRequest {
  onComplete: (result: boolean) => void;
  onError: () => void;
}

export default class FeatureRetriever {
  // request window delay in ms
  WINDOW_DELAY = 1000;
  AXIOS_INSTANCE = axios.create({
    baseURL: "http://localhost:8080/",
  });

  featureRequestQueue: Record<string, FeatureRequest> = {};
  featureMap: Record<string, boolean> = {};

  tickInterval?: NodeJS.Timer;

  tickRequestQueue() {

    // TODO: Arreglar ventana de requests.
    // Ahora mismo, se hacen no solo varias request de una misma feature,
    // sino tambien requests donde aparece la misma feature varias veces

    console.log("Ticking...", this.featureRequestQueue);
    if (Object.keys(this.featureRequestQueue).length === 0) {
      if (this.tickInterval)
      {
        clearInterval(this.tickInterval);
        delete this.tickInterval;
      }
      return;
    };

    const ids = Object.keys(this.featureRequestQueue);
    this.AXIOS_INSTANCE.post<Record<string, boolean>>(`/feature`, ids)
      .then((response) => {
        this.processFeatureRequest(response.data);
      })
      .catch((error) => {
        console.error(error);
        // Clear all the requests
        for (const featureRequest of Object.values(this.featureRequestQueue)) {
          featureRequest.onError();
        }
        this.featureRequestQueue = {};
        clearInterval(this.tickInterval!);
        delete this.tickInterval;
      });
  }

  /**
   * Gets the value of a feature or features. A feature is considered "ON"
   * if all the features in the list are true
   * @param ids A list of ids
   * @returns A promise that resolves with the feature boolean value
   */
  getFeature(ids: string[]): Promise<boolean> {
    if (!this.tickInterval) {
      // if the tick interval 
      this.tickInterval = setInterval(() => this.tickRequestQueue(), this.WINDOW_DELAY);
    }
    // console.log("Requested feature", ids);
    return new Promise(async (resolve, reject) => {
      // Iterate through ids, get every individual feature
      Promise.all(
        ids.map((id) => {
          // Check if already exists in featuremap
          if (id in this.featureMap) {
            return Promise.resolve(this.featureMap[id]);
          }
          return this.addFeatureToQueue(id);
        })
      )
        .then((values) => {
          // All features are true
          resolve(values.every((v) => v));
        })
        .catch(() => {
          reject();
        });
    });
  }

  /**
   * Adds a feature request to the queue.
   * @param featureId Id of the feature to retrieve
   * @returns A promise
   * that will be resolved once we know the feature value, that is, as soon as
   * the server returns it (even if we didn't request it explicitly - i.e. it
   * was returned together with a parent feature)
   */
  addFeatureToQueue(featureId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.featureRequestQueue[featureId] = {
        onComplete: resolve,
        onError: reject,
      };
    });
  }

  /**
   * Processes the map of features that came from the server
   * @param retrievedFeatures Dictionary of retrieved features
   */
  processFeatureRequest(retrievedFeatures: Record<string, boolean>) {
    console.log("received features", retrievedFeatures);
    for (const featureId of Object.keys(retrievedFeatures)) {
      this.setFeature(featureId, retrievedFeatures[featureId]);
    }
    console.log(
      "After processing the received features, remaining queue is",
      this.featureRequestQueue
    );
  }

  /**
   * Updates the feature map with the given feature. Updates
   * the feature request queue accordingly, removing items that
   * we already know the value of, and resolving pending promises.
   * @param id Id of the feature
   * @param value Value of the feature
   */
  setFeature(id: string, value: boolean) {
    this.featureMap[id] = value;
    // Call relevant pending callbacks and remove from queue
    for (const [featureId, featureRequest] of Object.entries(this.featureRequestQueue)) {
      if (featureId === id) {
        featureRequest.onComplete(value);
        delete this.featureRequestQueue[featureId];
      }
    }
  }
}
