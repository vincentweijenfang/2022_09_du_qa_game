/* eslint max-len:0, no-console:0, func-names: 0, no-mixed-operators:0 */
const fs = require('fs-extra'); // fs -> fs-extra
const path = require('path');
const gulp = require('gulp');
const changed = require('gulp-changed'); // 偵測 dist 端
const changedInPlace = require('gulp-changed-in-place'); // 偵測 source 端，避免每一張圖都執行 tinypng
const size = require('gulp-size');
const imagemin = require('gulp-imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const merge = require('merge-stream');
const spritesmith = require('gulp.spritesmith');
const buffer = require('vinyl-buffer');
const rimraf = require('rimraf');
const md5 = require('md5');

// gulp-util 已棄用，這篇文章底下有針對此套件功能推薦不同的套件：https://medium.com/gulpjs/gulp-util-ca3b1f9f9ac5
const debug = require('gulp-debug'); // https://www.npmjs.com/package/gulp-debug
// 下載 gulp-debug 附加的 - start
const log = require('fancy-log');
const through = require('through2');
const tildify = require('tildify');
const stringifyObject = require('stringify-object');
const chalk = require('chalk');
const prop = chalk.blue;
// 下載 gulp-debug 附加的 - end
const gulpif = require('gulp-if'); // https://www.npmjs.com/package/gulp-if
const tinypng = require('gulp-tinypng-compress'); // https://www.npmjs.com/package/gulp-tinypng-compress
const lazypipe = require('lazypipe'); // 在 Pipe 中建立一個中間件，搭配 gulp-if｜https://github.com/OverZealous/lazypipe


// https://github.com/twolfson/gulp.spritesmith
const isDirectory = (pathName:string):boolean => {
  try {
    return fs.statSync(pathName).isDirectory();
  } catch (error) {
    //
  }
  return false;
};
const getDirectoryFolderNames = (pathName:string):string[] => {
  const resolvePathName:string = path.resolve(pathName);
  if (!fs.existsSync(resolvePathName)) {
    return [];
  }
  return fs.readdirSync(resolvePathName).filter(isDirectory);
};


type CreateSpriteOptions = {
  globs : string;
  fileName: string;
  cssTemplate: string;
  imagesCount: number,
  animationIterationCount :string;
  animationDuration: string;
}
function createSprite(options:CreateSpriteOptions) {
  const {
    globs,
    fileName,
    cssTemplate,
    imagesCount,
    animationIterationCount = 'infinite',
    animationDuration = '1s',
  } = options;

  const spriteData = gulp.src(globs)
    .pipe(spritesmith({
      imgName: `sprite-sheet-${fileName}.png`,
      cssName: `${fileName}.styl`,
      padding: 4,
      imgOpts: {
        quality: 100,
      },
      cssTemplate,
      cssHandlebarsHelpers: {
        parseName: (name) => `${fileName}-${name}`,
        percent: (value, base) => `${(value / base) * 100}%`,
        bgPosition(spriteSize, imgSize, offset) {
          const result = (offset / (imgSize - spriteSize)) * 100;
          // eslint-disable-next-line
          if (isNaN(result)) {
            return '0';
          }
          return `${result}%`;
        },
        cssKeyframeName: () => `${fileName}-${md5(fileName)}`,
        cssSpriteClassName: () => `spr-${fileName}`,
        animationDuration: () => animationDuration,
        animationIterationCount: () => animationIterationCount,
        keyframePercent: (idx) => `${(idx / imagesCount * 100).toFixed(0)}%`,
        isEachLast: (idx) => idx + 1 === imagesCount,
      },
    }));
  const imgStream = spriteData.img
    .pipe(buffer())
    .pipe(gulp.dest('src/assets/img_src'));

  const cssStream = spriteData.css
    .pipe(gulp.dest('src/css/sprite-sheet'));
  return merge(imgStream, cssStream);
}

gulp.task('sprite', () => {
  const folders:string[] = getDirectoryFolderNames('src/assets/sprite_src');
  if (folders.length === 0) {
    return Promise.resolve('');
  }
  const cssTemplate = 'src/css/handlebars/basic-stylus.hbs';

  const spriteTasks = folders.map((folderName:string) => {
    const options = {
      globs: `src/assets/sprite_src/${folderName}/*.png`,
      fileName: folderName,
      cssTemplate,
    };
    return createSprite(options);
  });
  return merge(...spriteTasks);
});

gulp.task('css-sprite', () => {
  const folders:string = getDirectoryFolderNames('src/assets/css_sprite_src');
  if (folders.length === 0) {
    return Promise.resolve('');
  }
  const cssTemplate = 'src/css/handlebars/css-sprite.hbs';

  const spriteTasks = folders.map((folderName:string) => {
    const imagesCount = fs.readdirSync(path.resolve(`src/assets/css_sprite_src/${folderName}`)).length;
    const options = {
      globs: `src/assets/css_sprite_src/${folderName}/*.png`,
      fileName: folderName,
      cssTemplate,
      // css sprite 會用到的
      imagesCount, // 圖片數量
      animationIterationCount: '1', // animation-iteration-count infinite
      animationDuration: '2s', // animation-duration
    };
    return createSprite(options);
  });
  return merge(...spriteTasks);
});

gulp.task('m', () => {
  const imgSrc = [
    'src/assets/img_src/**/*.+(jpg|png|gif)',
    '!src/assets/img_src/_*',
  ];
  const otherSrc = imgSrc.map((imgPath) => (imgPath.indexOf('!') === 0 ? imgPath.substr(1) : `!${imgPath}`));
  otherSrc.push('src/assets/img_src/**/*.+(svg)');
  const imgDest = 'src/assets/img';

  const taskOtherSrc = gulp.src(otherSrc)
    .pipe(changed(imgDest))
    .pipe(size({ showFiles: true }))
    .pipe(gulp.dest(imgDest));

  const taskImgSrc = gulp.src(imgSrc)
    .pipe(changed(imgDest))
    // .pipe(changedInPlace())
    .pipe(size({ showFiles: true }))
    // 改成 Tinypng
    // .pipe(imagemin([
    //   imageminMozjpeg({ quality: 90 }),
    //   imagemin.optipng({ optimizationLevel: 5 }),
    // ]))
    .pipe(gulp.dest(imgDest))
  
  const taskImg = gulp.src(imgSrc)
    .pipe(changedInPlace())
    .pipe(size({ showFiles: true }))
    .pipe(
      through.obj(function(file, encoding, callback) {
        // console.log( 'cwd: '  + file.cwd, 'base: ' + file.base, 'path: ' + file.path, 'stat: ' + file.stat);
        // 這包沒用到｜start
        // const base = file.cwd + imgDest;
        // const filename = file.path.replace(file.base, '');
        // const data = fs.readFileSync(imgDest + '/.tinypng-sigs', 'utf-8');
        // const copyData = JSON.parse(data);
        // delete copyData[filename.substring(1)]; 
        // this.push(copyData);
        // 這包沒用到｜end
        callback(null, file);
      })
    )
    // .on('data', (data) => {
    //   console.log(data.exist);
    //   return data.exist;
    // })
    .pipe(gulp.dest(imgDest))
  return merge(
    taskOtherSrc, 
    taskImgSrc,
    taskImg,
  );
});

gulp.task('tinypng', function () {
  const imgDest = 'src/assets/img';
  const tinyImages = gulp.src(imgDest + '/**/*.+(jpg|png|gif)')
      .pipe(tinypng({
          key: 'mVD56Z8Vlsy92f88hwPkkT6ZlJG986R3', // 前往 Tinypng Developer 取得 API Key（記得要在他們的介面對該 Key 執行 Enable）
          sigFile: imgDest + '/.tinypng-sigs', // 透過 tinyong 簽章來判斷要不要 minify，避免無限 minify 下去。建議設置在輸出圖片的資料夾
          sameDest: true, // 如果壓縮後儲存到相同路徑，一定要設這個
          log: true
      }))
      .pipe(gulp.dest(imgDest));
  return merge(
    tinyImages
  );
});

gulp.task('rimraf', (cb) => {
  rimraf('./dist-build', cb);
});

gulp.task('buildToWWW', () => {
  const SRC = ['dist/**/*.*', '!dist/**/*.html'];
  const DEST = '../code/www/';
  const assetsPipe = gulp.src(SRC)
    .pipe(gulp.dest(DEST));

  const htmlPipe = gulp.src(['dist/**/*.html'])
    .pipe(gulp.dest('dist-build'));

  return merge(assetsPipe, htmlPipe);
});

gulp.task('www', gulp.series('rimraf', 'buildToWWW'));


gulp.task('watch', () => {
  gulp.watch('src/assets/img_src/**/*', gulp.series('m'));
  gulp.watch('src/assets/img/**/*', gulp.series('tinypng'));
  gulp.watch('src/assets/sprite_src/**/*.png', gulp.series('sprite'));
  gulp.watch('src/assets/css_sprite_src/**/*.png', gulp.series('css-sprite'));
});

gulp.task('default', gulp.series(
  'sprite', 
  'css-sprite', 
  'm', 
  'tinypng', 
  'watch'
));
