/* eslint-disable */

import React from 'react';
import FlatButton from 'material-ui/FlatButton';
import FontIcon from 'material-ui/FontIcon';
import Paper from 'material-ui/Paper';
import messages from 'lib/text';
import api from 'lib/api';

const Fragment = React.Fragment;

//const API = 'https://sheets.googleapis.com/v4/spreadsheets/1eEa-9dERtjug9rGAycjDjA7L2imu-53-44kkqrmro9c/values:batchGet?ranges=basedata&majorDimension=ROWS&key=AIzaSyCPK118zWL9Qqhl8Lsa3yQoo6YeccpoDKM';

class ProductImport extends React.Component {
	constructor(props) {
		super();
		this.state = {
			propstate: props,
			product_items: [],
			deleteCounter: 1,
			uploadedProducts: 0,
			errors: 0
		};
		this.loader = React.createRef();
		this.fetchData = this.fetchData.bind(this);
		this.deleteProducts = this.deleteProducts.bind(this);
		this.uploadProducts = this.uploadProducts.bind(this);
	}

	fetchData = () => {
		this.loader.current.style.setProperty('display', 'inline-block');
		let filter = {
			fields:
				'id,name,category_id,category_ids,category_name,sku,images,enabled,discontinued,stock_status,stock_quantity,price,on_sale,regular_price,url'
		};

		api.products
			.list(filter)
			.then(({ status, json }) => {
				// db has no products saved
				if (json.data.length < 1) {
					this.uploadProducts();
					return;
				}

				for (var i in json.data) {
					this.deleteProducts(json.data[i].id, json.data.length);
					if (json.data[i].images.length > 0) {
						api.products.images.delete(
							json.data[i].id,
							json.data[i].images[0].id
						);
					}
				}
			})
			.catch(error => {
				console.log(error);
			});
	};

	deleteProducts(id, arrayLength) {
		api.products.delete(id).then(() => {
			if (parseInt(this.state.deleteCounter) === parseInt(arrayLength)) {
				this.uploadProducts(); //upload just once
			}
			this.setState({ deleteCounter: this.state.deleteCounter + 1 });
		});
	}

	uploadProducts() {
		let productDraft = {
			enabled: true,
			category_id: null, //'5b8903f864300c8663503ad6',
			stock_quantity: null,
			regular_price: null,
			name: null,
			sku: null
		};

		let iterator = 1;
		let that = this;
		let statusCell = document.getElementsByClassName('sheet-cell-state');
		let errorsCounter = this.state.errors;

		for (var i = 1; i < this.state.product_items.length; i++) {
			if (this.state.product_items[i] !== undefined) {
				productDraft.category_id = this.state.product_items[i]['category_id'];
				productDraft.name = this.state.product_items[i]['name'];
				productDraft.stock_quantity = this.state.product_items[i][
					'stock_quantity'
				];
				productDraft.regular_price = this.state.product_items[i][
					'regular_price'
				];
				productDraft.enabled = this.state.product_items[i]['enabled'];
				productDraft.sku = this.state.product_items[i]['sku'];
				let path = this.state.product_items[i]['images'];

				if (
					productDraft.category_id !== '' &&
					productDraft.name !== '' &&
					productDraft.stock_quantity !== '' &&
					productDraft.regular_price !== '' &&
					productDraft.sku !== '' &&
					path !== ''
				) {
					statusCell[i].innerHTML = '&#x2713;';
					statusCell[i].style.color = 'green';
				} else {
					errorsCounter += 1;
					this.setState({ errors: errorsCounter });
				}
			} else {
				errorsCounter += 1;
				this.setState({ errors: ierrorsCounter });
			}

			let path = this.state.product_items[i]['images'];

			api.products
				.create(productDraft)
				.then(({ status, json }) => {
					this.uploadImages(json.id, path, that);
					this.setState({ deleteCounter: 0 });
					this.setState({ uploadedProducts: iterator });

					if (iterator === this.state.product_items.length - 1) {
						this.loader.current.style.setProperty('display', 'none');
					}
					iterator++;
				})
				.catch(error => {});
		}
	}

	uploadImages(id, path, that) {
		if (path !== '') {
			let xhr = new XMLHttpRequest();
			xhr.open('GET', '/' + path, true);
			xhr.responseType = 'arraybuffer';

			xhr.onload = function(e) {
				// Obtain a blob: URL for the image data.
				var arrayBufferView = new Uint8Array(this.response);
				var blob = new Blob([arrayBufferView], { type: 'image/jpeg' });
				var urlCreator = window.URL || window.webkitURL;
				let imageUrl = urlCreator.createObjectURL(blob);

				let files = new File([blob], path, { type: 'image/jpg' });
				files['preview'] = imageUrl;

				let form = new FormData();
				form.append('file', files);

				api.products.images
					.upload(id, form)
					.then(json => {})
					.catch(error => {
						console.log(error);
					});
			};
			xhr.send();
		}
	}

	componentDidMount() {
		let spreadsheetApiCredentials = undefined;
		document.getElementsByClassName('product-list')[0].style.display = 'none';

		//fetch product import spreadsheet data from settings and set api credentials for google
		api.settings.retrieveImportSettings().then(({ status, json }) => {
			spreadsheetApiCredentials =
				'https://sheets.googleapis.com/v4/spreadsheets/' +
				json.sheetid +
				'/values:batchGet?ranges=' +
				json.range +
				'&majorDimension=ROWS&key=' +
				json.apikey;

			fetch(spreadsheetApiCredentials)
				.then(response => response.json())
				.then(data => {
					let batchRowValues = data.valueRanges[0].values;

					let counter = 0;
					const rows = [];
					for (let i = 0; i < batchRowValues.length; i++) {
						batchRowValues[i].unshift('No.');

						let rowObject = {};
						for (let j = 0; j < batchRowValues[i].length; j++) {
							if (i > 0) {
								batchRowValues[i][0] = counter;
							}
							rowObject[batchRowValues[0][j]] = batchRowValues[i][j];
						}
						counter++;
						rows.push(rowObject);
					}

					this.setState({ product_items: rows });

					let status = document.getElementsByClassName('sheet-cell-state');
					[].slice.call(status).forEach((element, i) => {
						if (i === 0) {
							return;
						}
						element.style.color = 'red';
					});
				});
		});
	}

	render() {
		const { onImportProducts } = this.props;

		let keyCounter = 0;
		let listHeader = this.state.product_items.map((p, j) => {
			if (j < 1) {
				return (
					<tr className="tr-header" key={keyCounter}>
						{Object.keys(p)
							.filter(k => k !== 'id')
							.map((k, i) => {
								return (
									<th className="td-header" key={keyCounter + i}>
										<div
											ref="status"
											className={
												k === 'state' ? 'sheet-cell-state' : 'sheet-cell-' + i
											}
											suppressContentEditableWarning="true"
											key={p[i] + j + i + p[j]}
											contentEditable="true"
											value={k}
											onInput={this.editColumn}
										>
											{p[k]}
										</div>
									</th>
								);
							})}
					</tr>
				);
			}
			keyCounter++;
		});
		let list = this.state.product_items.map((p, j) => {
			if (j >= 1) {
				return (
					<tr className="tr-body" key={keyCounter + j}>
						{Object.keys(p)
							.filter(k => k !== 'id')
							.map((k, i) => {
								return (
									<td className="td-body" key={keyCounter + i}>
										<div
											className={
												k === 'state' ? 'sheet-cell-state' : 'sheet-cell-' + i
											}
											suppressContentEditableWarning="true"
											key={p[i] + j + i + p[j]}
											contentEditable="true"
											value={k}
											onInput={this.editColumn}
										>
											{p[k]}
										</div>
									</td>
								);
							})}
					</tr>
				);
			}
			keyCounter++;
		});

		let tableStyle = {
			align: 'center'
		};

		let showLoader = {
			display: 'none'
		};
		return (
			<Fragment>
				<div>
					<div style={{ margin: 20, color: 'rgba(0, 0, 0, 0.52)' }}>
						{messages.settings_googlesheet_header}
						<p>
							{' '}
							{messages.settings_googlesheet_products}{' '}
							{this.state.product_items.length - 1} /{' '}
							{messages.settings_googlesheet_uploaded}{' '}
							{this.state.uploadedProducts} /{' '}
							{messages.settings_googlesheet_errors}{' '}
							{this.state.errors > 0 ? this.state.errors : 0}
							<span
								ref={this.loader}
								style={showLoader}
								className="loader loader-product-import"
							>
								<svg className="circular" viewBox="25 25 50 50">
									<circle
										className="path"
										cx="50"
										cy="50"
										r="20"
										fill="none"
										strokeWidth="2"
										strokeMiterlimit="10"
									/>
								</svg>
							</span>
						</p>
					</div>
					<Paper className="paper-box" zDepth={1}>
						<div style={{ width: '100%' }}>
							<div
								className="spread-sheet-container"
								style={this.state.productsImport}
							>
								<fieldset className="spread-sheet-table">
									<div className="schedule padd-lr">
										<div className="tbl-header">
											<table
												cellPadding="0"
												cellSpacing="0"
												id="mytable"
												style={tableStyle}
											>
												<thead>{listHeader}</thead>
											</table>
										</div>
										<div className="tbl-content">
											<table
												cellPadding="0"
												cellSpacing="0"
												id="mytable"
												style={tableStyle}
											>
												<tbody>{list}</tbody>
											</table>
										</div>
									</div>
								</fieldset>
							</div>
						</div>
						<div className="buttons-box">
							<FlatButton
								label={messages.import}
								primary={true}
								onClick={this.fetchData}
							/>
						</div>
					</Paper>
				</div>
			</Fragment>
		);
	}
}

/*ProductImport.propTypes = {
	onStartImportProducts: PropTypes.func.isRequired
}*/
module.exports = ProductImport;
