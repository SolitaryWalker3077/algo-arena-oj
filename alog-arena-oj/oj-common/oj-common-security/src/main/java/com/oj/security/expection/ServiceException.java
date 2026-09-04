package com.oj.security.expection;

import com.oj.common.enums.ResultCode;
import lombok.Getter;

@Getter
public class ServiceException extends RuntimeException {

    private ResultCode resultCode;

    public ServiceException(ResultCode resultCode) {
        this.resultCode = resultCode;
    }
}
