import {
  lookupCachedUploadUrl,
  resetCache,
  resolveAllShortUrls,
} from "pretty-text/upload-short-url";
import { module, test } from "qunit";
import pretender, { response } from "discourse/tests/helpers/create-pretender";
import { ajax } from "discourse/lib/ajax";
import { fixture } from "discourse/tests/helpers/qunit-helpers";
import { settled } from "@ember/test-helpers";

function stubUrls(imageSrcs, attachmentSrcs, otherMediaSrcs) {
  if (!imageSrcs) {
    imageSrcs = [
      {
        short_url: "upload://a.jpeg",
        url: "/images/avatar.png?a",
        short_path: "/uploads/short-url/a.jpeg",
      },
      {
        short_url: "upload://b.jpeg",
        url: "/images/avatar.png?b",
        short_path: "/uploads/short-url/b.jpeg",
      },
      {
        short_url: "upload://z.jpeg",
        url: "/images/avatar.png?z",
        short_path: "/uploads/short-url/z.jpeg",
      },
    ];
  }

  if (!attachmentSrcs) {
    attachmentSrcs = [
      {
        short_url: "upload://c.pdf",
        url: "/uploads/default/original/3X/c/b/3.pdf",
        short_path: "/uploads/short-url/c.pdf",
      },
    ];
  }

  if (!otherMediaSrcs) {
    otherMediaSrcs = [
      {
        short_url: "upload://d.mp4",
        url: "/uploads/default/original/3X/c/b/4.mp4",
        short_path: "/uploads/short-url/d.mp4",
      },
      {
        short_url: "upload://e.mp3",
        url: "/uploads/default/original/3X/c/b/5.mp3",
        short_path: "/uploads/short-url/e.mp3",
      },
      {
        short_url: "upload://f.mp4",
        url: "http://localhost:3000/uploads/default/original/3X/c/b/6.mp4",
        short_path: "/uploads/short-url/f.mp4",
      },
    ];
  }

  pretender.post("/uploads/lookup-urls", () =>
    response(imageSrcs.concat(attachmentSrcs.concat(otherMediaSrcs)))
  );

  fixture().innerHTML =
    imageSrcs.map((src) => `<img data-orig-src="${src.short_url}"/>`).join("") +
    attachmentSrcs
      .map(
        (src) =>
          `<a data-orig-href="${src.short_url}">big enterprise contract.pdf</a>`
      )
      .join("") +
    `<div class="scoped-area"><img data-orig-src="${imageSrcs[2].url}"></div>` +
    otherMediaSrcs
      .map((src) => {
        if (src.short_url.indexOf("mp3") > -1) {
          return `<audio controls><source data-orig-src="${src.short_url}"></audio>`;
        } else {
          return `<video controls><source data-orig-src="${src.short_url}"></video>`;
        }
      })
      .join("");
}

module("Unit | Utility | pretty-text/upload-short-url", function (hooks) {
  hooks.afterEach(function () {
    resetCache();
  });

  test("resolveAllShortUrls", async function (assert) {
    stubUrls();
    let lookup;

    lookup = lookupCachedUploadUrl("upload://a.jpeg");
    assert.deepEqual(lookup, {});

    await resolveAllShortUrls(ajax, { secure_media: false }, fixture());
    await settled();

    lookup = lookupCachedUploadUrl("upload://a.jpeg");

    assert.deepEqual(lookup, {
      url: "/images/avatar.png?a",
      short_path: "/uploads/short-url/a.jpeg",
    });

    lookup = lookupCachedUploadUrl("upload://b.jpeg");

    assert.deepEqual(lookup, {
      url: "/images/avatar.png?b",
      short_path: "/uploads/short-url/b.jpeg",
    });

    lookup = lookupCachedUploadUrl("upload://c.jpeg");
    assert.deepEqual(lookup, {});

    lookup = lookupCachedUploadUrl("upload://c.pdf");
    assert.deepEqual(lookup, {
      url: "/uploads/default/original/3X/c/b/3.pdf",
      short_path: "/uploads/short-url/c.pdf",
    });

    lookup = lookupCachedUploadUrl("upload://d.mp4");
    assert.deepEqual(lookup, {
      url: "/uploads/default/original/3X/c/b/4.mp4",
      short_path: "/uploads/short-url/d.mp4",
    });

    lookup = lookupCachedUploadUrl("upload://e.mp3");
    assert.deepEqual(lookup, {
      url: "/uploads/default/original/3X/c/b/5.mp3",
      short_path: "/uploads/short-url/e.mp3",
    });

    lookup = lookupCachedUploadUrl("upload://f.mp4");
    assert.deepEqual(lookup, {
      url: "http://localhost:3000/uploads/default/original/3X/c/b/6.mp4",
      short_path: "/uploads/short-url/f.mp4",
    });
  });

  test("resolveAllShortUrls - href + src replaced correctly", async function (assert) {
    stubUrls();
    await resolveAllShortUrls(ajax, { secure_media: false }, fixture());
    await settled();

    let image1 = fixture().querySelector("img");
    let image2 = fixture().querySelectorAll("img")[1];
    let audio = fixture().querySelector("audio");
    let video = fixture().querySelector("video");
    let link = fixture().querySelector("a");

    assert.equal(image1.getAttribute("src"), "/images/avatar.png?a");
    assert.equal(image2.getAttribute("src"), "/images/avatar.png?b");
    assert.equal(link.getAttribute("href"), "/uploads/short-url/c.pdf");
    assert.equal(
      video.querySelector("source").getAttribute("src"),
      "/uploads/default/original/3X/c/b/4.mp4"
    );
    assert.equal(
      audio.querySelector("source").getAttribute("src"),
      "/uploads/default/original/3X/c/b/5.mp3"
    );
  });

  test("resolveAllShortUrls - url with full origin replaced correctly", async function (assert) {
    stubUrls();
    await resolveAllShortUrls(ajax, { secure_media: false }, fixture());
    await settled();
    let video = fixture().querySelectorAll("video")[1];

    assert.equal(
      video.querySelector("source").getAttribute("src"),
      "http://localhost:3000/uploads/default/original/3X/c/b/6.mp4"
    );
  });

  test("resolveAllShortUrls - when secure media is enabled use the attachment full URL", async function (assert) {
    stubUrls(
      null,
      [
        {
          short_url: "upload://c.pdf",
          url: "/secure-media-uploads/default/original/3X/c/b/3.pdf",
          short_path: "/uploads/short-url/c.pdf",
        },
      ],
      null
    );
    await resolveAllShortUrls(ajax, { secure_media: true }, fixture());
    await settled();

    let link = fixture().querySelector("a");
    assert.equal(
      link.getAttribute("href"),
      "/secure-media-uploads/default/original/3X/c/b/3.pdf"
    );
  });

  test("resolveAllShortUrls - scoped", async function (assert) {
    stubUrls();
    let lookup;

    let scopedElement = fixture().querySelector(".scoped-area");
    await resolveAllShortUrls(ajax, {}, scopedElement);
    await settled();

    lookup = lookupCachedUploadUrl("upload://z.jpeg");

    assert.deepEqual(lookup, {
      url: "/images/avatar.png?z",
      short_path: "/uploads/short-url/z.jpeg",
    });

    // do this because the pretender caches ALL the urls, not
    // just the ones being looked up (like the normal behaviour)
    resetCache();
    await resolveAllShortUrls(ajax, {}, scopedElement);
    await settled();

    lookup = lookupCachedUploadUrl("upload://a.jpeg");
    assert.deepEqual(lookup, {});
  });
});
