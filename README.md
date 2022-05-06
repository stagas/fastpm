<h1>
fastpm <a href="https://npmjs.org/package/fastpm"><img src="https://img.shields.io/badge/npm-v0.0.1-F00.svg?colorA=000"/></a> <a href="src"><img src="https://img.shields.io/badge/loc-263-FFF.svg?colorA=000"/></a> <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-F0B.svg?colorA=000"/></a>
</h1>

<p></p>

Fast package manager for Node.js.

<h4>
<table><tr><td title="Triple click to select and copy paste">
<code>npm i fastpm -g</code>
</td><td title="Triple click to select and copy paste">
<code>pnpm add fastpm -g</code>
</td><td title="Triple click to select and copy paste">
<code>yarn global add fastpm</code>
</td></tr></table>
</h4>

## What it does

**`fastpm`** will install the dependencies of your project, using `npm`,
but in a central location and then symlink them inside `node_modules`.

This allows for faster installation times and saves disk space.

## How

For every dependency, it creates a project that requires it and then uses the `--global-style` parameter to make that dependency contain all of its dependencies in a flat structure. This way it can be symlinked to a location and it will work with
minimal issues. It also tries to install `peerDependencies` transitively
in order to work with certain tooling such as `eslint` and `jest`. It also runs
`postinstall` scripts on the dependencies as it would have been the case if they were installed normally within our project. Finally, it runs `npm install` inside the
target project's directory, which lets it perform the necessary local links and do its own final magic that somewhat fixes the state of `node_modules` if it wasn't 100% achieved during the symlinks.

This is obviously very experimental and not the recommended way of doing things, but it works for my use-case and I did manage to get rid **>30gb** of unnecessary duplication using this technique and so I hope it's useful to someone.

Currently it only has one command, `install`, but maybe in the future I'll add more commands that fit my workflow, who knows.

## API

<p>  <details id="InstallOptions$1" title="Class" open><summary><span><a href="#InstallOptions$1">#</a></span>  <code><strong>InstallOptions</strong></code>    </summary>  <a href="src/install.ts#L38">src/install.ts#L38</a>  <ul>        <p>  <details id="constructor$2" title="Constructor" ><summary><span><a href="#constructor$2">#</a></span>  <code><strong>constructor</strong></code><em>(options)</em>    </summary>  <a href="src/install.ts#L56">src/install.ts#L56</a>  <ul>    <p>  <details id="new InstallOptions$3" title="ConstructorSignature" ><summary><span><a href="#new InstallOptions$3">#</a></span>  <code><strong>new InstallOptions</strong></code><em>()</em>    </summary>    <ul><p><a href="#InstallOptions$1">InstallOptions</a></p>      <p>  <details id="options$4" title="Parameter" ><summary><span><a href="#options$4">#</a></span>  <code><strong>options</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>{}</code></span>  </summary>    <ul><p><span>Partial</span>&lt;<a href="#InstallOptions$1">InstallOptions</a>&gt;</p>        </ul></details></p>  </ul></details></p>    </ul></details><details id="bin$5" title="Property" ><summary><span><a href="#bin$5">#</a></span>  <code><strong>bin</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>'safe-npm'</code></span>  </summary>  <a href="src/install.ts#L40">src/install.ts#L40</a>  <ul><p>string</p>        </ul></details><details id="cache$9" title="Property" ><summary><span><a href="#cache$9">#</a></span>  <code><strong>cache</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>...</code></span>  </summary>  <a href="src/install.ts#L52">src/install.ts#L52</a>  <ul><p>string</p>        </ul></details><details id="deps$10" title="Property" ><summary><span><a href="#deps$10">#</a></span>  <code><strong>deps</strong></code>    </summary>  <a href="src/install.ts#L54">src/install.ts#L54</a>  <ul><p>string</p>        </ul></details><details id="force$8" title="Property" ><summary><span><a href="#force$8">#</a></span>  <code><strong>force</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>false</code></span>  </summary>  <a href="src/install.ts#L49">src/install.ts#L49</a>  <ul><p>boolean</p>        </ul></details><details id="peer$7" title="Property" ><summary><span><a href="#peer$7">#</a></span>  <code><strong>peer</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>false</code></span>  </summary>  <a href="src/install.ts#L46">src/install.ts#L46</a>  <ul><p>boolean</p>        </ul></details><details id="root$6" title="Property" ><summary><span><a href="#root$6">#</a></span>  <code><strong>root</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>'.'</code></span>  </summary>  <a href="src/install.ts#L43">src/install.ts#L43</a>  <ul><p>string</p>        </ul></details></p></ul></details><details id="install$11" title="Function" open><summary><span><a href="#install$11">#</a></span>  <code><strong>install</strong></code><em>(options)</em>    </summary>  <a href="src/install.ts#L61">src/install.ts#L61</a>  <ul>    <p>    <details id="options$13" title="Parameter" ><summary><span><a href="#options$13">#</a></span>  <code><strong>options</strong></code>    </summary>    <ul><p><a href="#InstallOptions$1">InstallOptions</a></p>        </ul></details>  <p><strong>install</strong><em>(options)</em>  &nbsp;=&gt;  <ul><span>Promise</span>&lt;void&gt;</ul></p></p>    </ul></details></p>

## Credits

- [decarg](https://npmjs.org/package/decarg) by [stagas](https://github.com/stagas) &ndash; decorator based cli arguments parser
- [semver](https://npmjs.org/package/semver) by [GitHub Inc.](https://github.com/npm) &ndash; The semantic version parser used by npm.

## Contributing

[Fork](https://github.com/stagas/fastpm/fork) or [edit](https://github.dev/stagas/fastpm) and submit a PR.

All contributions are welcome!

## License

<a href="LICENSE">MIT</a> &copy; 2022 [stagas](https://github.com/stagas)
