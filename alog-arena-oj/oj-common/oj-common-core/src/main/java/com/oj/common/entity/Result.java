package com.oj.common.entity;

import com.oj.common.enums.ResultCode;
import lombok.Data;

@Data
public class Result<T> {

    /**
     * 状态码
     */
    private int code;
    /**
     * 消息内容
     */
    private String msg;
    /**
     * 数据类型
     */
    private T data;

    public static <T> Result<T> ok() {
        return assembleResult(null, ResultCode.SUCCESS);
    }

    public static <T> Result<T> ok(T data) {
        return assembleResult(data, ResultCode.SUCCESS);
    }

    public static <T> Result<T> fail() {
        return assembleResult(null, ResultCode.FAILED);
    }

    public static <T> Result<T> fail(int code,String msg) {
        return assembleResult(code, msg, null);
    }

    /**
     * 指定错误码
     *
     * @param resultCode 指定错误码
     * @param <T>
     * @return
     */
    public static <T> Result<T> fail(ResultCode resultCode) {
        return assembleResult(null, resultCode);
    }

    private static <T> Result<T> assembleResult(T data , ResultCode resultCode) {
        Result<T> result = new Result<>();
        result.setCode(resultCode.getCode());
        result.setData(data);
        result.setMsg(resultCode.getMsg());
        return result;
    }

    private static <T> Result<T> assembleResult(int code,String msg,T data) {
        Result<T> result = new Result<>();
        result.setCode(code);
        result.setMsg(msg);
        result.setData(data);
        return result;
    }
}
