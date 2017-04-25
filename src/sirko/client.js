import Page from './page';
import Predictor from './predictor';
import Processor from './processor';

/**
 * This object tracks the current page visited by a particular user
 * and adds a hint for the browser about a next page to be visited by the user.
 */
const Client = {
  predict: function(reqInfo, conf) {
    reqInfo = Processor.preprocess(reqInfo, conf);

    if(!reqInfo) return false;

    let predictor = new Predictor(conf.engineUrl);

    // don't try to prerender a page if the current page
    // isn't visible yet. Otherwise, it leads to prerendering
    // a chain of pages for one request.
    let promise = Page.onceVisible().then(() => {
      return predictor.predict(
        reqInfo.currentPath,
        reqInfo.referrer
      );
    }).then((res) => {
      let prediction = res[0], fromCache = res[1];

      Processor.postprocess({
        hint:     reqInfo.hint,
        nextPath: prediction
      }, conf);

      let isPrevCorrect;

      // If the prediction is received from the cache, the user's callback shouldn't
      // track the prediction again, it was already tracked. Performing this check,
      // we make sure an external tracking service integrated by the user receives
      // only unique predictions.
      if (!fromCache && predictor.prevPrediction()) {
        // check whether the previous prediction is correct or not.
        // This info is useful to track accuracy of predictions.
        isPrevCorrect = predictor.prevPrediction() == reqInfo.currentPath;
      }

      return new Promise((resolve) => {
        resolve([prediction, isPrevCorrect]);
      });
    });

    return promise;
  }
};

export default Client;
